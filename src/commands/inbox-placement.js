import { printData } from "../output.js";
import { validated, validateBody, OkResponseSchema } from "../schemas/validate.js";
import { makeClient, resolveFormat, loadJson, pick, requireConfirm } from "./_helpers.js";
import {
  InboxPlacementCreateBody, InboxPlacementListResponse, InboxPlacementMutateResponse,
} from "../schemas/inbox-placement.schema.js";

export function registerInboxPlacementCommand(program) {
  const cmd = program.command("inbox-placement").description("Inbox placement (deliverability) tests");

  cmd.command("list")
    .description("Get inbox placement tests")
    .usage("[options]")
    .addHelpText("after", `
To view the full API response, append --format json to your command.
`)
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .option("--owned-by <email>", "Filter by owner email")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/inbox-placement",
        params: { limit: opts.limit, skip: opts.skip, owned_by: opts.ownedBy },
      });
      printData(validated(data, InboxPlacementListResponse), resolveFormat(program));
    });

  cmd.command("create")
    .description("Create an inbox placement test")
    .usage("--name <name> --mode <mode> --source <source> [--content-type <type>] [--sender-id <id>] [--email-senders <path>] [--subject <subject>] [--body <html>] [--sequence-id <id>] [--template-id <id>] [--schedule-day <0-6>] [--plain-text] [--from-json <path>]")
    .addHelpText("after", `
Required:
  --name <name>            Test name (min 3 characters)
  --mode <mode>            one-time | recurring
  --source <source>        from-salesblink | from-outside

Options:
  --content-type <type>    custom | sequence | template (required when source=from-salesblink or mode=recurring)
  --sender-id <id>         Legacy single sender UUID (do not use with --email-senders)
  --email-senders <path>   JSON file with array of sender/folder objects
  --subject <subject>      Subject (required for custom content_type)
  --body <html>            Body HTML (required for custom content_type)
  --sequence-id <id>       Sequence ID (required for sequence content_type)
  --template-id <id>       Template ID (required for template or sequence content_type)
  --schedule-day <0-6>     Day of week (required when mode=recurring)
  --plain-text             Send as plain text instead of HTML
  --from-json <path>       Read request body from JSON file (overrides other options)

To view the full API response, append --format json to your command.
`)
    .option("--name <name>", "Test name")
    .option("--mode <mode>", "one-time | recurring")
    .option("--source <source>", "from-salesblink | from-outside")
    .option("--content-type <type>", "custom | sequence | template")
    .option("--sender-id <id>", "Legacy single sender UUID")
    .option("--email-senders <path>", "JSON file with array of sender/folder objects")
    .option("--subject <subject>", "Subject")
    .option("--body <html>", "Body HTML")
    .option("--sequence-id <id>", "Sequence ID")
    .option("--template-id <id>", "Template ID")
    .option("--schedule-day <n>", "Day of week 0-6", parseInt)
    .option("--plain-text", "Send as plain text instead of HTML")
    .option("--from-json <path>", "Read request body from JSON file")
    .action(async (opts) => {
      const client = makeClient(program);
      const emailSenders = opts.emailSenders ? loadJson(opts.emailSenders) : undefined;
      const raw = opts.fromJson
        ? loadJson(opts.fromJson)
        : pick({
            name: opts.name,
            mode: opts.mode,
            source: opts.source,
            content_type: opts.contentType,
            sender_id: opts.senderId,
            email_senders: emailSenders,
            subject: opts.subject,
            body: opts.body,
            sequence_id: opts.sequenceId,
            template_id: opts.templateId,
            schedule_day: opts.scheduleDay,
            plainText: opts.plainText,
          });
      const body = validateBody(raw, InboxPlacementCreateBody);
      const data = await client.request({ method: "POST", path: "/inbox-placement", body });
      printData(validated(data, InboxPlacementMutateResponse), resolveFormat(program));
    });

  cmd.command("delete")
    .description("Delete an inbox placement test")
    .usage("--id <id> --confirm")
    .addHelpText("after", `
Required:
  --id <id>      Test ID
  --confirm      Confirm the deletion

To view the full API response, append --format json to your command.
`)
    .requiredOption("--id <id>", "Test ID")
    .option("--confirm", "Required confirmation")
    .action(async (opts) => {
      requireConfirm(opts.confirm, `delete inbox placement test ${opts.id}`);
      const client = makeClient(program);
      const data = await client.request({ method: "DELETE", path: `/inbox-placement/${opts.id}` });
      printData(validated(data, OkResponseSchema), resolveFormat(program));
    });

  cmd.command("pause")
    .description("Pause an inbox placement test")
    .usage("--id <id>")
    .addHelpText("after", `
Required:
  --id <id>      Test ID

To view the full API response, append --format json to your command.
`)
    .requiredOption("--id <id>", "Test ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ method: "PUT", path: `/inbox-placement/${opts.id}/pause` });
      printData(validated(data, OkResponseSchema), resolveFormat(program));
    });
}
