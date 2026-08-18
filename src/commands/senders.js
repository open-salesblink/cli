import { printData } from "../output.js";
import { CliError } from "../client.js";
import { validated, validateBody } from "../schemas/validate.js";

import { makeClient, resolveFormat, loadJson, pick, boolOpt, csvArr } from "./_helpers.js";
import {
  SenderCreateBody, SenderUpdateBody, SenderIdsBody,
  SendersListResponse, SenderMutateResponse, WarmupLinksResponse,
  SenderHealthResponse, SenderWarmupStatsResponse, SenderFetchMessagesResponse,

} from "../schemas/senders.schema.js";
import { OAuthInitBody, OpaqueResponse } from "../schemas/misc.schema.js";

export function registerSendersCommand(program) {
  const cmd = program.command("senders").description("Manage email sender accounts");

  cmd.command("list")
    .description("Get all email senders (flat list, not grouped by folder)")
    .usage("[--limit <n>] [--skip <n>] [--search <q>] [--folder <id>] [--filter <string>] [--owned-by <email>]")
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .option("--search <q>", "Search query")
    .option("--folder <id>", "Legacy folder UUID filter")
    .option("--filter <string>", "Legacy filter string")
    .option("--owned-by <email>", "Filter by owner email")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/senders",
        params: {
          limit: opts.limit, skip: opts.skip, search: opts.search,
          folder: opts.folder, filter: opts.filter, owned_by: opts.ownedBy,
        },
      });
      printData(validated(data, SendersListResponse), resolveFormat(program));
    });

  cmd.command("add")
    .description("Add a single sender (SMTP/IMAP, Gmail OAuth, or Outlook OAuth)")
    .usage("[--email <email>] | --from-json <path> | --google | --outlook")
    .option("--email <email>", "Sender email (SMTP/IMAP only)")
    .option("--from-json <path>", "Read request body from JSON file (recommended for SMTP/IMAP)")
    .option("--google", "Generate a Google OAuth URL to connect a Gmail sender")
    .option("--outlook", "Generate an Outlook OAuth URL to connect an Outlook sender")
    .addHelpText("after", `
Examples:
  salesblink senders add --email <email>
  salesblink senders add --from-json <path>
  salesblink senders add --google
  salesblink senders add --outlook

For SMTP/IMAP, use --from-json:
  {
    "from_email": "string",
    "password": "string",
    "smtp_host": "string",
    "smtp_port": 587,
    "imap_host": "string",
    "imap_port": 993,
    "smtp_username": "string",
    "smtp_password": "string"
  }

For Gmail or Outlook OAuth, use --google or --outlook. The CLI will print the full OAuth URL. Copy and paste that URL into your browser, authenticate, and the sender will be created in your SalesBlink account automatically.

Note: --from-json accepts the full request body and overrides other flags.
`)
    .action(async (opts) => {
      const client = makeClient(program);
      if (opts.google || opts.outlook) {
        const path = opts.google ? "/oauth/google" : "/oauth/outlook";
        const body = validateBody({}, OAuthInitBody);
        const data = await client.request({ method: "POST", path, body });
        const parsed = validated(data, OpaqueResponse);
        const url = parsed.data?.auth_url ?? parsed.data?.url ?? parsed.data;
        process.stdout.write(`${url}\n`);
        process.stderr.write(`\nCopy and paste the URL above into your browser and authenticate to connect this ${opts.google ? "Gmail" : "Outlook"} sender.\n`);
        process.stderr.write("After authentication, the sender will be created in your SalesBlink account.\n");
        return;
      }
      const raw = opts.fromJson ? loadJson(opts.fromJson) : pick({ email: opts.email });
      const body = validateBody(raw, SenderCreateBody);
      const data = await client.request({ method: "POST", path: "/senders", body });
      printData(validated(data, SenderMutateResponse), resolveFormat(program));
    });

  cmd.command("bulk")
    .description("Add senders in bulk via CSV multipart upload")
    .usage("--file <path>")
    .option("--file <path>", "CSV file with sender credentials (multipart upload)")
    .addHelpText("after", `\nRequired:\n  --file <path>  CSV file with sender credentials\n\nThe CSV is uploaded as multipart/form-data with field name 'csvFile'.\n`)
    .action(async (opts) => {
      const client = makeClient(program);
      if (!opts.file) {
        throw new CliError("--file <path> is required");
      }
      const data = await client.request({ method: "POST", path: "/senders/bulk", file: { field: "csvFile", path: opts.file } });
      printData(validated(data, SenderMutateResponse), resolveFormat(program));
    });

  cmd.command("update")
    .description("Update a sender (warmup, tracking, signature, etc.)")
    .usage("--id <id> [--from-json <path>]")
    .requiredOption("--id <id>", "Sender ID")
    .option("--from-json <path>", "Read request body from JSON file (recommended)")
    .addHelpText("after", `\nExamples:\n  salesblink senders update --id <id> --from-json <path>\n\nJSON file (--from-json):\n  {\n    "warmupEnabled": true,\n    "warmup_limit": 40,\n    "signature": "<p>...</p>"\n  }\n\nNote: --from-json accepts the full request body and overrides other flags.\n`)
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson ? loadJson(opts.fromJson) : {};
      const body = validateBody(raw, SenderUpdateBody);
      const data = await client.request({ method: "PATCH", path: `/senders/${opts.id}`, body });
      printData(validated(data, SenderMutateResponse), resolveFormat(program));
    });

  cmd.command("warmup-links")
    .description("Get warmup links")
    .usage("[options]")
    .addHelpText("after", `
Note: the API returns all matching warmup links; limit/skip pagination is not supported.

To view the full API response, append --format json to your command.
`)
    .option("--owned-by <email>", "Filter by owner (admin/owner only)")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: "/warmup-links", params: { owned_by: opts.ownedBy } });
      printData(validated(data, WarmupLinksResponse), resolveFormat(program));
    });


  cmd.command("reconnect")
    .description("Reconnect a sender")
    .usage("--id <id>")
    .requiredOption("--id <id>", "Sender ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ method: "POST", path: `/senders/${opts.id}/reconnect` });
      printData(validated(data, SenderMutateResponse), resolveFormat(program));
    });

  cmd.command("health")
    .description("Get sender health and reputation score")
    .usage("--id <id>")
    .requiredOption("--id <id>", "Sender ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: `/senders/${opts.id}/health` });
      printData(validated(data, SenderHealthResponse), resolveFormat(program));
    });

  cmd.command("warmup-stats")
    .description("Get sender warmup daily stats")
    .usage("--id <id> [--days <n>]")
    .requiredOption("--id <id>", "Sender ID")
    .option("--days <n>", "Number of days (max 90)", parseInt)
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: `/senders/${opts.id}/warmup-stats`, params: { days: opts.days } });
      printData(validated(data, SenderWarmupStatsResponse), resolveFormat(program));
    });

  cmd.command("fetch-messages")
    .description("Fetch messages from a sender's inbox")
    .usage("--id <id>")
    .requiredOption("--id <id>", "Sender ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ method: "POST", path: `/senders/${opts.id}/fetch-messages` });
      printData(validated(data, SenderFetchMessagesResponse), resolveFormat(program));
    });

  cmd.command("fetch-messages-multi")
    .description("Bulk fetch messages across multiple senders")
    .usage("--ids <id1,id2,...> | --from-json <path>")
    .option("--ids <ids>", "Comma-separated sender IDs", csvArr)
    .option("--from-json <path>", "JSON file: { ids: [...] }")
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson ? loadJson(opts.fromJson) : pick({ ids: opts.ids });
      const body = validateBody(raw, SenderIdsBody);
      const data = await client.request({ method: "POST", path: "/senders/multi/fetch-messages", body });
      printData(validated(data, SenderFetchMessagesResponse), resolveFormat(program));
    });

}
