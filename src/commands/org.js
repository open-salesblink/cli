import { printData } from "../output.js";
import { validated, validateBody, OkResponseSchema } from "../schemas/validate.js";
import { makeClient, resolveFormat, pick } from "./_helpers.js";
import {
  FolderCreateBody, FoldersListResponse, FolderCreateResponse,
  DomainsListResponse, DomainsSearchResponse, SignaturesListResponse,
} from "../schemas/org.schema.js";

export function registerFoldersCommand(program) {
  const cmd = program.command("folders").description("Manage folders");

  cmd.command("list")
    .description("Get all folders")
    .usage("[--type <type>] [--search <q>] [--owned-by <email>]")
    .addHelpText("after", `
Filter by folder type:
  --type email-sender  Email-sender folders only
  --type general       General folders (lists, templates, sequences) only
  --type all           All folders (default if omitted)

To view the full API response, append --format json to your command.
`)
    .option("--type <type>", "Folder type filter: all, general, or email-sender")
    .option("--search <q>", "Search query")
    .option("--owned-by <email>", "Filter by owner email")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/folders",
        params: { type: opts.type, search: opts.search, owned_by: opts.ownedBy },
      });
      printData(validated(data, FoldersListResponse), resolveFormat(program));
    });

  cmd.command("create")
    .description("Create a folder")
    .usage("--name <name> [--type <type>]")
    .addHelpText("after", `
Required:
  --name <name>    Folder name

Optional:
  --type <type>    Only include "email-sender" when creating a folder for email senders.
                   For general folders (lists, templates, sequences), do not include --type.

To view the full API response, append --format json to your command.
`)
    .requiredOption("--name <name>", "Folder name")
    .option("--type <type>", 'Folder type: "email-sender" or omitted for general')
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody(pick({ name: opts.name, type: opts.type }), FolderCreateBody);
      const data = await client.request({ method: "POST", path: "/folders", body });
      printData(validated(data, FolderCreateResponse), resolveFormat(program));
    });
}

export function registerDomainsCommand(program) {
  const cmd = program.command("domains").description("Custom tracking domains");

  cmd.command("list")
    .description("Get custom domains")
    .usage("[options]")
    .addHelpText("after", `
Note: the API returns all matching domains; limit/skip pagination is not supported.

To view the full API response, append --format json to your command.
`)
    .option("--owned-by <email>", "Filter by owner (admin/owner only)")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: "/domains", params: { owned_by: opts.ownedBy } });
      printData(validated(data, DomainsListResponse), resolveFormat(program));
    });

  cmd.command("search")
    .description("Search available domains")
    .usage("--keyword <kw>")
    .addHelpText("after", `
Required:
  --keyword <kw>   Keyword to search

To view the full API response, append --format json to your command.
`)
    .requiredOption("--keyword <kw>", "Keyword to search")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: "/domains/search", params: { keyword: opts.keyword } });
      printData(validated(data, DomainsSearchResponse), resolveFormat(program));
    });
}

export function registerSignaturesCommand(program) {
  const cmd = program.command("signatures").description("Email signatures");
  cmd.command("list")
    .description("Get email signatures")
    .usage("[options]")
    .addHelpText("after", `
Note: the API returns all matching signatures; limit/skip pagination is not supported.

To view the full API response, append --format json to your command.
`)
    .option("--owned-by <email>", "Filter by owner (admin/owner only)")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: "/signatures", params: { owned_by: opts.ownedBy } });
      printData(validated(data, SignaturesListResponse), resolveFormat(program));
    });
}
