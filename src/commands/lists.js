import { printData } from "../output.js";
import { validated, validateBody, OkResponseSchema } from "../schemas/validate.js";
import { makeClient, resolveFormat, loadJson, pick, boolOpt } from "./_helpers.js";
import {
  ListCreateBody, ListUpdateBody, ArchiveBody,
  ListListResponse, ListGetResponse, LeadsListResponse,
} from "../schemas/lists.schema.js";

export function registerListsCommand(program) {
  const cmd = program.command("lists").description("Manage lead lists");

  cmd.command("list")
    .description("Get all lists")
    .usage("[--limit <n>] [--skip <n>] [--search <q>] [--folder <id>] [--integration <name>] [--sort-by <field>] [--sort-type asc|desc] [--owned-by <email>]")
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .option("--search <q>", "Search query")
    .option("--folder <id>", "Filter by folder ID")
    .option("--integration <name>", "Filter by integration name")
    .option("--sort-by <field>", "Sort field")
    .option("--sort-type <type>", "Sort direction: asc or desc")
    .option("--owned-by <email>", "Filter by owner email")
    .addHelpText("after", `
Note: boolean filters (starred/archived) are unreliable and not exposed. Supported filters: folder, integration, search, sortBy, sortType, owned-by.

To view the full API response, append --format json to your command.
`)
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/lists",
        params: {
          limit: opts.limit, skip: opts.skip, search: opts.search,
          folder: opts.folder, integration: opts.integration,
          sortBy: opts.sortBy, sortType: opts.sortType,
          owned_by: opts.ownedBy,
        },
      });
      printData(validated(data, ListListResponse), resolveFormat(program));
    });

  cmd.command("get")
    .description("Get a specific list")
    .usage("--id <id>")
    .requiredOption("--id <id>", "List ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: `/lists/${opts.id}` });
      printData(validated(data, ListGetResponse), resolveFormat(program));
    });

  cmd.command("create")
    .description("Create a list")
    .usage("[--name <name>] [--folder <folder>] [--starred] [--verification] [--archive-invalid] [--archive-risky] | --from-json <path>")
    .option("--name <name>", "List name")
    .option("--folder <folder>", "Folder")
    .option("--starred", "Star the list")
    .option("--verification", "Enable verification")
    .option("--archive-invalid", "Archive invalid emails")
    .option("--archive-risky", "Archive risky emails")
    .option("--from-json <path>", "Read request body from JSON file")
    .addHelpText("after", `\nExamples:\n  salesblink lists create --name <name>\n  salesblink lists create --from-json <path>\n\nJSON file (--from-json):\n  {\n    "name": "string",\n    "folder": "string",\n    "starred": true,\n    "verification": true,\n    "archive_invalid": true,\n    "archive_risky": true\n  }\n\nNote: --from-json accepts the full request body and overrides other flags.\n`)
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson
        ? loadJson(opts.fromJson)
        : pick({
            name: opts.name, folder: opts.folder, starred: opts.starred,
            verification: opts.verification, archive_invalid: opts.archiveInvalid, archive_risky: opts.archiveRisky,
          });
      const body = validateBody(raw, ListCreateBody);
      const data = await client.request({ method: "POST", path: "/lists", body });
      printData(validated(data, ListGetResponse), resolveFormat(program));
    });

  cmd.command("update")
    .description("Update a list")
    .usage("--id <id> [--name <name>] [--starred <bool>] [--verification <bool>] [--archive-invalid <bool>] [--archive-risky <bool>] [--duplicate-removal <bool>] [--duplicate-removal-other-list <bool>] [--duplicate-removal-team-list <bool>] | --from-json <path>")
    .requiredOption("--id <id>", "List ID")
    .option("--name <name>", "List name")
    .option("--starred <bool>", "Starred (true/false)")
    .option("--verification <bool>", "Verification (true/false)")
    .option("--archive-invalid <bool>", "Archive invalid (true/false)")
    .option("--archive-risky <bool>", "Archive risky (true/false)")
    .option("--duplicate-removal <bool>", "Duplicate removal within list (true/false)")
    .option("--duplicate-removal-other-list <bool>", "Duplicate removal across your lists (true/false)")
    .option("--duplicate-removal-team-list <bool>", "Duplicate removal across team lists (true/false)")
    .option("--from-json <path>", "Read request body from JSON file")
    .addHelpText("after", `\nExamples:\n  salesblink lists update --id <id> --name <name>\n  salesblink lists update --id <id> --from-json <path>\n\nJSON file (--from-json):\n  {\n    "name": "string",\n    "starred": true,\n    "verification": true,\n    "archive_invalid": true,\n    "archive_risky": true,\n    "duplicate_removal": true,\n    "duplicate_removal_other_list": true,\n    "duplicate_removal_team_list": true\n  }\n\nNote: --from-json accepts the full request body and overrides other flags.\n`)
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson
        ? loadJson(opts.fromJson)
        : pick({
            name: opts.name, starred: boolOpt(opts.starred), verification: boolOpt(opts.verification),
            archive_invalid: boolOpt(opts.archiveInvalid), archive_risky: boolOpt(opts.archiveRisky),
            duplicate_removal: boolOpt(opts.duplicateRemoval), duplicate_removal_other_list: boolOpt(opts.duplicateRemovalOtherList),
            duplicate_removal_team_list: boolOpt(opts.duplicateRemovalTeamList),
          });
      const body = validateBody(raw, ListUpdateBody);
      const data = await client.request({ method: "PATCH", path: `/lists/${opts.id}`, body });
      printData(validated(data, ListGetResponse), resolveFormat(program));
    });

  cmd.command("archive")
    .description("Archive or unarchive a list")
    .usage("--id <id> --archived <bool>")
    .requiredOption("--id <id>", "List ID")
    .requiredOption("--archived <bool>", "true to archive, false to unarchive")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody({ archived: boolOpt(opts.archived) }, ArchiveBody);
      const data = await client.request({ method: "PUT", path: `/lists/${opts.id}/archive`, body });
      printData(validated(data, OkResponseSchema), resolveFormat(program));
    });

  cmd.command("leads")
    .description("Get leads in a list")
    .usage("--id <id> [--limit <n>] [--skip <n>] [--search <q>] [--archived <bool>] [--sort asc|desc] [--sequence <id>] [--status <status>] [--owned-by <email>]")
    .requiredOption("--id <id>", "List ID")
    .option("--limit <n>", "Page size (max 500)", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .option("--search <q>", "Search query")
    .option("--archived <bool>", "Filter archived (truthy only; false is unreliable)")
    .option("--sort <dir>", "Sort direction by creation date: asc or desc")
    .option("--sequence <id>", "Filter by sequence ID")
    .option("--status <status>", "Filter by lead status (e.g. not_contacted, contacted, opened, clicked, replied, bounced, unsubscribed)")
    .option("--owned-by <email>", "Filter by owner email")
    .addHelpText("after", `
Supported filters: search, archived, sort, sequence, status, owned-by. Limit can be up to 500.

To view the full API response, append --format json to your command.
`)
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: `/lists/${opts.id}/leads`,
        params: {
          limit: opts.limit, skip: opts.skip, search: opts.search,
          archived: boolOpt(opts.archived), sort: opts.sort,
          sequence: opts.sequence, status: opts.status,
          owned_by: opts.ownedBy,
        },
      });
      printData(validated(data, LeadsListResponse), resolveFormat(program));
    });
}
