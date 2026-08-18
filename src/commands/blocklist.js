import { printData } from "../output.js";
import { validated, validateBody, OkResponseSchema } from "../schemas/validate.js";
import { makeClient, resolveFormat, loadJson, pick, csvArr, requireConfirm } from "./_helpers.js";
import {
  BlocklistAddBody, BlocklistRemoveBody,
  BlocklistListResponse, BlocklistCheckResponse, BlocklistMutateResponse,
} from "../schemas/blocklist.schema.js";

export function registerBlocklistCommand(program) {
  const cmd = program.command("blocklist").description("Manage blocklist (emails/domains that will not receive outreach). Uses the unsubscribe API behind the scenes.");

  cmd.command("list")
    .description("List blocked emails and domains")
    .usage("[--limit <n>] [--skip <n>] [--search <q>] [--type <email|domain>]")
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .option("--search <q>", "Search query")
    .option("--type <type>", "Filter by type: email or domain")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/unsubscribe",
        params: { limit: opts.limit, skip: opts.skip, search: opts.search, type: opts.type },
      });
      printData(validated(data, BlocklistListResponse), resolveFormat(program));
    });

  cmd.command("add")
    .description("Add emails and/or domains to the blocklist")
    .usage("[--emails <a,b>] [--domains <a,b>] | --from-json <path>")
    .option("--emails <emails>", "Comma-separated emails", csvArr)
    .option("--domains <domains>", "Comma-separated domains", csvArr)
    .option("--from-json <path>", "Read request body from JSON file")
    .addHelpText("after", `\nExamples:\n  salesblink blocklist add --emails spam@example.com,bad@example.com\n  salesblink blocklist add --domains competitor.com\n  salesblink blocklist add --from-json <path>\n\nJSON file (--from-json):\n  {\n    "emails": ["spam@example.com", "competitor.com"]\n  }\n\nNote: --from-json accepts the full request body and overrides other flags.\n`)
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson
        ? loadJson(opts.fromJson)
        : pick({ emails: [...(opts.emails || []), ...(opts.domains || [])] });
      const body = validateBody(raw, BlocklistAddBody);
      const data = await client.request({ method: "POST", path: "/unsubscribe", body });
      printData(validated(data, BlocklistMutateResponse), resolveFormat(program));
    });

  cmd.command("remove")
    .description("Remove emails/domains from the blocklist")
    .usage("[--emails <a,b>] | --from-json <path>")
    .option("--emails <emails>", "Comma-separated emails/domains", csvArr)
    .option("--from-json <path>", "Read request body from JSON file")
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson ? loadJson(opts.fromJson) : pick({ emails: opts.emails });
      const body = validateBody(raw, BlocklistRemoveBody);
      const data = await client.request({ method: "POST", path: "/unsubscribe/remove", body });
      printData(validated(data, BlocklistMutateResponse), resolveFormat(program));
    });

  cmd.command("delete")
    .description("Delete a blocklist entry by ID")
    .usage("--id <id>")
    .requiredOption("--id <id>", "Blocklist entry ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ method: "DELETE", path: `/unsubscribe/${opts.id}` });
      printData(validated(data, OkResponseSchema), resolveFormat(program));
    });

  cmd.command("delete-all")
    .description("Delete all blocklist entries")
    .usage("--confirm")
    .option("--confirm", "Confirm deletion")
    .action(async (opts) => {
      requireConfirm(opts.confirm, "delete all blocklist entries");
      const client = makeClient(program);
      const data = await client.request({ method: "DELETE", path: "/unsubscribe" });
      printData(validated(data, OkResponseSchema), resolveFormat(program));
    });

  cmd.command("check")
    .description("Check whether an email is blocked")
    .usage("--email <email>")
    .requiredOption("--email <email>", "Email to check")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: "/unsubscribe/check", params: { email: opts.email } });
      printData(validated(data, BlocklistCheckResponse), resolveFormat(program));
    });
}
