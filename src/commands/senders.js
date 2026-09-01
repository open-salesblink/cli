import { printData } from "../output.js";
import { validated, validateBody } from "../schemas/validate.js";

import { makeClient, resolveFormat, loadJson, pick, csvArr } from "./_helpers.js";
import {
  SenderUpdateBody, SenderIdsBody,
  SendersListResponse, SenderMutateResponse, WarmupLinksResponse,
  SenderHealthResponse, SenderWarmupStatsResponse, SenderFetchMessagesResponse,

} from "../schemas/senders.schema.js";


export function registerSendersCommand(program) {
  const cmd = program.command("senders").description("Manage email sender accounts");

  cmd.command("list")
    .description("Get all email senders (flat list, not grouped by folder)")
    .usage("[--limit <n>] [--skip <n>] [--search <q>] [--folder <id>] [--filter <string>] [--owned-by <email>]")
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .option("--search <q>", "Search query")
    .option("--folder <id>", "Email-sender folder UUID filter")
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
    .description("Get the email-sender connection login link")
    .usage("[options]")
    .addHelpText("after", `
The public sender endpoint returns a magic login link to the email-sender connection page in the SalesBlink web UI.

To view the full API response, append --format json to your command.
`)
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ path: "/senders/connect-link" });
      printData(data, resolveFormat(program));
    });

  cmd.command("bulk")
    .description("Get the bulk sender upload login link")
    .usage("[options]")
    .addHelpText("after", `
The public bulk sender endpoint returns a magic login link to the email-sender connection page in the SalesBlink web UI.

To view the full API response, append --format json to your command.
`)
    .action(async () => {
      const client = makeClient(program);
      const data = await client.request({ path: "/senders/bulk-connect-link" });
      printData(data, resolveFormat(program));
    });

  cmd.command("update")
    .description("Update a sender (warmup, tracking, signature, folder, etc.)")
    .usage("--id <id> [--folder <folder-id>] [--from-json <path>]")
    .requiredOption("--id <id>", "Sender ID")
    .option("--folder <folder-id>", "Email-sender folder ID to move the sender into (a folder created with --type email-sender). Pass an empty string to remove from folder.")
    .option("--from-json <path>", "Read request body from JSON file (recommended)")
    .addHelpText("after", `\nExamples:\n  salesblink senders update --id <id> --from-json <path>\n  salesblink senders update --id <id> --folder <folder-id>\n\nJSON file (--from-json):\n  {\n    "warmup_enabled": true,\n    "warmup_limit": 40,\n    "signature": "<p>...</p>",\n    "folder": "folder_uuid"\n  }\n\nUse the "folder" field to move an email sender into an email-sender folder, or pass an empty string to remove it from its current folder. Lists and other assets use general folders and cannot be placed in an email-sender folder.\n\nNote: --from-json accepts the full request body and overrides other flags.\n`)
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson ? loadJson(opts.fromJson) : pick({ folder: opts.folder });
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
