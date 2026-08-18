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
    .description("Get all folders (the API currently returns only email-sender folders)")
    .usage("[--search <q>] [--owned-by <email>]")
    .addHelpText("after", `
Note: the public API returns only email-sender folders. The --type option is not supported because the API overwrites/ignores it.

To view the full API response, append --format json to your command.
`)
    .option("--search <q>", "Search query")
    .option("--owned-by <email>", "Filter by owner email")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/folders",
        params: { search: opts.search, owned_by: opts.ownedBy },
      });
      printData(validated(data, FoldersListResponse), resolveFormat(program));
    });

  cmd.command("create")
    .description("Create a folder")
    .usage("--name <name>")
    .addHelpText("after", `
Required:
  --name <name>    Folder name

Note: the public API only accepts email-sender folders. The type is always email-sender.

To view the full API response, append --format json to your command.
`)
    .requiredOption("--name <name>", "Folder name")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody(pick({ name: opts.name, type: "email-sender" }), FolderCreateBody);
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
