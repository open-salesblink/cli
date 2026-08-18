import { printData } from "../output.js";
import { validated, validateBody, OkResponseSchema } from "../schemas/validate.js";
import { makeClient, resolveFormat, loadJson, pick, boolOpt, csvArr, toTimestamp } from "./_helpers.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  SequenceCreateBody, SequenceUpdateBody, ArchiveBody, SequenceStatusBody,
  SequenceListResponse, SequenceGetResponse, SequenceStatsResponse, SequenceCloneResponse,
  SequenceExportResponse,
} from "../schemas/sequences.schema.js";
import {
  LeadActivityResponse, LeadSequenceMessagesResponse, LeadUnsubscribeResponse,
} from "../schemas/leads.schema.js";

export function registerSequencesCommand(program) {
  const cmd = program.command("sequences").description("Manage email sequences (campaigns)");

  cmd.command("list")
    .description("Get all sequences")
    .usage("[--limit <n>] [--skip <n>] [--search <q>] [--status <status>] [--folder <id>] [--send-all] [--sort-by <field>] [--sort-type asc|desc] [--owned-by <email>]")
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .option("--search <q>", "Search query")
    .option("--status <status>", "running | paused | completed | needs-attention")
    .option("--folder <id>", "Filter by folder ID")
    .option("--send-all", "Include both archived and active sequences")
    .option("--sort-by <field>", "Sort field")
    .option("--sort-type <type>", "Sort direction: asc or desc")
    .option("--owned-by <email>", "Filter by owner email")
    .addHelpText("after", `
Note: boolean filters (starred/archived) are unreliable and not exposed. Supported filters: search, status, folder, sortBy, sortType, sendAll, owned-by.

To view the full API response, append --format json to your command.
`)
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/sequences",
        params: {
          limit: opts.limit, skip: opts.skip, search: opts.search,
          status: opts.status, folder: opts.folder,
          sendAll: boolOpt(opts.sendAll),
          sortBy: opts.sortBy, sortType: opts.sortType,
          owned_by: opts.ownedBy,
        },
      });
      printData(validated(data, SequenceListResponse), resolveFormat(program));
    });

  cmd.command("get")
    .description("Get a specific sequence")
    .usage("--id <id>")
    .requiredOption("--id <id>", "Sequence ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: `/sequences/${opts.id}` });
      printData(validated(data, SequenceGetResponse), resolveFormat(program));
    });

  cmd.command("create")
    .description("Create a sequence")
    .usage("[--name <name>] [--senders <ids>] [--list-id <ids>] [--from-json <steps-path>] [options]")
    .option("--name <name>", "Sequence name")
    .option("--senders <ids>", "Comma-separated sender IDs or folder IDs")
    .option("--list-id <ids>", "Comma-separated list IDs")
    .option("--paused <bool>", "Pause after creation (true/false). Default is true; pass false to schedule immediately")
    .option("--launch-timing-mode <mode>", "now | schedule")
    .option("--scheduled-at <date>", "ISO 8601 start date when launch-timing-mode=schedule (converted to a Unix timestamp)")
    .option("--timezone <tz>", "IANA timezone (default: America/New_York)")
    .option("--delay-enabled <bool>", "Randomize send times between delay-from and delay-to (true/false)")
    .option("--delay-from <minutes>", "Minimum delay between emails", parseInt)
    .option("--delay-to <minutes>", "Maximum delay between emails", parseInt)
    .option("--stop-when-reply-received <bool>", "Stop sequence when a reply is received (true/false)")
    .option("--stop-when-reply-received-when <value>", "contact | contact-with-same-domain")
    .option("--check-email-before-sending <bool>", "Send emails to the outbox for approval first (true/false)")
    .option("--from-json <path>", "Read the full request body from a JSON file (overrides other flags)")
    .addHelpText("after", `
Required (unless using --from-json for the full body):
  --name <name>              Sequence name
  --senders <ids>            Comma-separated sender IDs or folder IDs
  --list-id <ids>            Comma-separated list IDs
  --from-json <path>         JSON file with the sequence steps (or full body)

Common options:
  --paused <bool>            Pause after creation. Default is true; pass false to schedule immediately and show leads.
  --launch-timing-mode <mode> now | schedule
  --scheduled-at <date>      ISO 8601 start date when mode=schedule (converted to a Unix timestamp)
  --timezone <tz>            IANA timezone (default: America/New_York)
  --delay-enabled <bool>     Randomize send times (true/false)
  --delay-from <minutes>     Minimum delay between emails
  --delay-to <minutes>       Maximum delay between emails
  --stop-when-reply-received <bool>  Stop sequence on reply
  --stop-when-reply-received-when <value>  contact | contact-with-same-domain
  --check-email-before-sending <bool>  Send to outbox for approval before sending

Advanced options (use --from-json):
  folder, starred, evergreen, bounceThreshold, bouncePause, autoPause, autoTagReplies,
  emailSendingHours, sendToOnlyVerifiedEmail, validEmail, riskyEmail, invalidEmail,
  checkEmailOpen, checkEmailClick, checkEmailReply, plainText, auto_reply, matchProvider,
  skip_esg, bcc

Examples:
  salesblink sequences create --name "Campaign" --senders sender-id --list-id list-id --from-json steps.json
  salesblink sequences create --name "Campaign" --senders sender-id --list-id list-id --from-json steps.json --paused false
  salesblink sequences create --from-json full-body.json

JSON file for steps (--from-json):
  {
    "steps": [
      { "type": "email", "template_id": "template-id" },
      { "type": "delay", "days": 3 }
    ]
  }

JSON file for full request body (--from-json):
  {
    "name": "string",
    "senders": "sender-id-1,sender-id-2",
    "lists": ["list-id"],
    "steps": [
      { "type": "email", "template_id": "template-id" },
      { "type": "delay", "days": 3 }
    ],
    "paused": false,
    "launchTimingMode": "schedule",
    "scheduledAt": "2026-07-22T14:17:00-04:00",
    "timezone": "America/New_York",
    "checkEmailBeforeSending": false
  }

Note: JSON keys must match the API field names (camelCase), e.g. checkEmailBeforeSending, not check-email-before-sending.
Note: The API creates sequences paused by default. Contacts are only scheduled and the lead count is populated when paused is false (or after unpausing via sequences update). When --from-json is used, CLI flags override the corresponding JSON fields. For scheduled sequences with paused=false and no explicit checkEmailBeforeSending, the CLI defaults it to false so emails send directly.
`)
    .action(async (opts) => {
      const client = makeClient(program);
      const fromJson = opts.fromJson ? loadJson(opts.fromJson) : {};
      const fromFlags = pick({
        name: opts.name,
        senders: opts.senders,
        lists: csvArr(opts.listId),
        paused: boolOpt(opts.paused),
        launchTimingMode: opts.launchTimingMode,
        scheduledAt: opts.scheduledAt,
        timezone: opts.timezone,
        delayEnabled: boolOpt(opts.delayEnabled),
        delayFrom: opts.delayFrom,
        delayTo: opts.delayTo,
        stopWhenReplyRecieved: boolOpt(opts.stopWhenReplyReceived),
        stopWhenReplyRecievedWhen: opts.stopWhenReplyReceivedWhen,
        checkEmailBeforeSending: boolOpt(opts.checkEmailBeforeSending),
      });
      const raw = { ...fromJson, ...fromFlags };
      if (raw.scheduledAt !== undefined) raw.scheduledAt = toTimestamp(raw.scheduledAt);
      if (
        raw.launchTimingMode === "schedule" &&
        raw.paused === false &&
        raw.checkEmailBeforeSending === undefined
      ) {
        raw.checkEmailBeforeSending = false;
      }
      const body = validateBody(raw, SequenceCreateBody);
      const data = await client.request({ method: "POST", path: "/sequences", body });
      printData(validated(data, SequenceGetResponse), resolveFormat(program));
    });

  cmd.command("update")
    .description("Update sequence properties and state")
    .usage("--id <id> [--paused <bool>] [--from-json <path>] [options]")
    .requiredOption("--id <id>", "Sequence ID")
    .option("--paused <bool>", "Pause/resume (true/false)")
    .option("--name <name>", "Sequence name")
    .option("--senders <ids>", "Comma-separated sender IDs or folder IDs")
    .option("--list-id <ids>", "Comma-separated list IDs")
    .option("--launch-timing-mode <mode>", "now | schedule")
    .option("--scheduled-at <date>", "ISO 8601 start date when launch-timing-mode=schedule (converted to a Unix timestamp)")
    .option("--timezone <tz>", "IANA timezone")
    .option("--delay-enabled <bool>", "Randomize send times (true/false)")
    .option("--delay-from <minutes>", "Minimum delay between emails", parseInt)
    .option("--delay-to <minutes>", "Maximum delay between emails", parseInt)
    .option("--stop-when-reply-received <bool>", "Stop sequence on reply (true/false)")
    .option("--stop-when-reply-received-when <value>", "contact | contact-with-same-domain")
    .option("--check-email-before-sending <bool>", "Send to outbox for approval before sending (true/false)")
    .option("--from-json <path>", "Read request body from JSON file")
    .addHelpText("after", `
Required:
  --id <id>                  Sequence ID

Options:
  --paused <bool>            Pause/resume (true/false). Unpausing schedules contacts and populates the lead count.
  --name <name>              Sequence name
  --senders <ids>            Comma-separated sender IDs or folder IDs
  --list-id <ids>            Comma-separated list IDs
  --launch-timing-mode <mode> now | schedule
  --scheduled-at <date>      ISO 8601 start date when mode=schedule (converted to a Unix timestamp)
  --timezone <tz>            IANA timezone
  --delay-enabled <bool>     Randomize send times (true/false)
  --delay-from <minutes>     Minimum delay between emails
  --delay-to <minutes>       Maximum delay between emails
  --stop-when-reply-received <bool>  Stop sequence on reply
  --stop-when-reply-received-when <value>  contact | contact-with-same-domain
  --check-email-before-sending <bool>  Send to outbox for approval before sending
  --from-json <path>         JSON file with any sequence fields

Note: --from-json loads the base request body. Any CLI flags you also pass will override the corresponding JSON fields.
`)
        .action(async (opts) => {
      const client = makeClient(program);
      const fromJson = opts.fromJson ? loadJson(opts.fromJson) : {};
      const fromFlags = pick({
        name: opts.name,
        senders: opts.senders,
        lists: csvArr(opts.listId),
        paused: boolOpt(opts.paused),
        launchTimingMode: opts.launchTimingMode,
        scheduledAt: opts.scheduledAt,
        timezone: opts.timezone,
        delayEnabled: boolOpt(opts.delayEnabled),
        delayFrom: opts.delayFrom,
        delayTo: opts.delayTo,
        stopWhenReplyRecieved: boolOpt(opts.stopWhenReplyReceived),
        stopWhenReplyRecievedWhen: opts.stopWhenReplyReceivedWhen,
        checkEmailBeforeSending: boolOpt(opts.checkEmailBeforeSending),
      });
      const raw = { ...fromJson, ...fromFlags };
      if (raw.scheduledAt !== undefined) raw.scheduledAt = toTimestamp(raw.scheduledAt);
      const body = validateBody(raw, SequenceUpdateBody);
      const data = await client.request({ method: "PATCH", path: `/sequences/${opts.id}`, body });
      printData(validated(data, SequenceGetResponse), resolveFormat(program));
    });

  cmd.command("archive")
    .description("Archive or unarchive a sequence")
    .usage("--id <id> --archived <bool>")
    .requiredOption("--id <id>", "Sequence ID")
    .requiredOption("--archived <bool>", "true to archive, false to unarchive")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody({ archived: boolOpt(opts.archived) }, ArchiveBody);
      const data = await client.request({ method: "PUT", path: `/sequences/${opts.id}/archive`, body });
      printData(validated(data, OkResponseSchema), resolveFormat(program));
    });

  cmd.command("clone")
    .description("Clone a sequence")
    .usage("--id <id>")
    .requiredOption("--id <id>", "Sequence ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ method: "POST", path: `/sequences/${opts.id}/clone` });
      printData(validated(data, SequenceCloneResponse), resolveFormat(program));
    });

  cmd.command("stats")
    .description("Get sequence stats")
    .usage("--id <id> [--from <date>] [--to <date>] [--sender <email>]")
    .requiredOption("--id <id>", "Sequence ID")
    .option("--from <date>", "Start date (ignored by the API, accepted for compatibility)")
    .option("--to <date>", "End date (ignored by the API, accepted for compatibility)")
    .option("--sender <email>", "Filter by sender (ignored by the API, accepted for compatibility)")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: `/sequences/${opts.id}/stats`,
        params: { from: opts.from, to: opts.to, sender: opts.sender },
      });
      printData(validated(data, SequenceStatsResponse), resolveFormat(program));
    });


  cmd.command("export")
    .description("Export sequence leads as CSV to the Downloads folder")
    .usage("--id <id> [--limit <n>] [--output <path>]")
    .requiredOption("--id <id>", "Sequence ID")
    .option("--limit <n>", "Max leads to export (default 10000, max 50000)", parseInt)
    .option("--output <path>", "Override output file path")
    .action(async (opts) => {
      const client = makeClient(program);
      const csv = await client.request({
        path: `/sequences/${opts.id}/export`,
        params: { limit: opts.limit },
        rawText: true,
      });
      const downloadsDir = join(homedir(), "Downloads");
      mkdirSync(downloadsDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = opts.output || join(downloadsDir, `salesblink-sequence-${opts.id}-${timestamp}.csv`);
      writeFileSync(filename, csv, "utf-8");
      process.stderr.write(`CSV saved to: ${filename}\n`);
    });

  cmd.command("status")
    .description("Update sequence status (ACTIVE, PAUSED, STOPPED, ARCHIVED)")
    .usage("--id <id> --status <status>")
    .requiredOption("--id <id>", "Sequence ID")
    .requiredOption("--status <status>", "ACTIVE | PAUSED | STOPPED | ARCHIVED")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody({ status: opts.status.toUpperCase() }, SequenceStatusBody);
      const data = await client.request({ method: "POST", path: `/sequences/${opts.id}/status`, body });
      printData(validated(data, SequenceGetResponse), resolveFormat(program));
    });

  cmd.command("leads")
    .description("List leads in a sequence")
    .usage("--id <id> [--limit <n>] [--skip <n>]")
    .requiredOption("--id <id>", "Sequence ID")
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: `/sequences/${opts.id}/leads`,
        params: { limit: opts.limit, skip: opts.skip },
      });
      printData(validated(data, LeadActivityResponse), resolveFormat(program));
    });

  cmd.command("lead-messages")
    .description("Get message history for a lead in a sequence")
    .usage("--id <id> --lead-id <leadId>")
    .requiredOption("--id <id>", "Sequence ID")
    .requiredOption("--lead-id <leadId>", "Lead ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: `/sequences/${opts.id}/leads/${opts.leadId}/messages` });
      printData(validated(data, LeadSequenceMessagesResponse), resolveFormat(program));
    });

  cmd.command("unsubscribe-lead")
    .description("Unsubscribe a lead from a sequence")
    .usage("--id <id> --lead-id <leadId>")
    .requiredOption("--id <id>", "Sequence ID")
    .requiredOption("--lead-id <leadId>", "Lead ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        method: "POST",
        path: `/sequences/${opts.id}/leads/${opts.leadId}/unsubscribe`,
      });
      printData(validated(data, LeadUnsubscribeResponse), resolveFormat(program));
    });

}
