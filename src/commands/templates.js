import { printData } from "../output.js";
import { CliError } from "../client.js";
import { validated, validateBody, OkResponseSchema } from "../schemas/validate.js";
import { makeClient, resolveFormat, loadJson, pick, boolOpt, csvArr } from "./_helpers.js";
import {
  TemplateCreateBody, TemplateUpdateBody, ArchiveBody,
  TemplateListResponse, TemplateGetResponse,
} from "../schemas/templates.schema.js";

export function registerTemplatesCommand(program) {
  const cmd = program.command("templates").description("Manage email templates");

  cmd.command("list")
    .description("Get all templates")
    .usage("[--limit <n>] [--skip <n>] [--search <q>] [--folder <id>] [--type <type>] [--task-type <type>] [--include-tests] [--sort-by <field>] [--sort-type asc|desc] [--owned-by <email>]")
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .option("--search <q>", "Search query")
    .option("--folder <id>", "Filter by folder ID")
    .option("--type <type>", "Filter by template type")
    .option("--task-type <type>", "Filter by task type")
    .option("--include-tests", "Include template tests")
    .option("--sort-by <field>", "Sort field")
    .option("--sort-type <type>", "Sort direction: asc or desc")
    .option("--owned-by <email>", "Filter by owner email")
    .addHelpText("after", `
Note: boolean filters (starred/archived) are unreliable and not exposed. Supported filters: folder, type, taskType, search, sortBy, sortType, includeTests, owned-by.

To view the full API response, append --format json to your command.
`)
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/templates",
        params: {
          limit: opts.limit, skip: opts.skip, search: opts.search,
          folder: opts.folder, type: opts.type, taskType: opts.taskType,
          includeTests: boolOpt(opts.includeTests),
          sortBy: opts.sortBy, sortType: opts.sortType,
          owned_by: opts.ownedBy,
        },
      });
      printData(validated(data, TemplateListResponse), resolveFormat(program));
    });

  cmd.command("get")
    .description("Get a specific template")
    .usage("--id <id>")
    .requiredOption("--id <id>", "Template ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: `/templates/${opts.id}` });
      printData(validated(data, TemplateGetResponse), resolveFormat(program));
    });

  cmd.command("create")
    .description("Create a template")
    .usage("[--name <name>] [--subject <subject>] [--content <html>] [--folder <folder>] [--starred <bool>] [--attachments <paths>] | --from-json <path>")
    .option("--name <name>", "Template name")
    .option("--subject <subject>", "Subject line")
    .option("--content <html>", "HTML content")
    .option("--folder <folder>", "Folder")
    .option("--starred <bool>", "Starred (true/false)")
    .option("--attachments <paths>", "Comma-separated file paths to attach (max 3)", csvArr)
    .option("--from-json <path>", "Read request body from JSON file")
    .addHelpText("after", `
Examples:
  salesblink templates create --name <name> --subject <subject> --content <html>
  salesblink templates create --from-json <path>
  salesblink templates create --name <name> --subject <subject> --content <html> --attachments ./file1.pdf,./file2.jpg

JSON file (--from-json):
  {
    "name": "string",
    "subject_line": "string",
    "content": "<p>Hello</p>",
    "folder": "string",
    "starred": true
  }

Note: --from-json accepts the full request body and overrides other flags. Attachments must be passed via --attachments, not inside the JSON body.
`)
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson
        ? loadJson(opts.fromJson)
        : pick({ name: opts.name, subject_line: opts.subject, content: opts.content, folder: opts.folder, starred: boolOpt(opts.starred) });
      const body = validateBody(raw, TemplateCreateBody);
      const attachments = opts.attachments ?? [];
      if (attachments.length > 3) {
        throw new CliError("Maximum 3 attachments allowed");
      }
      const data = await client.request({
        method: "POST",
        path: "/templates",
        body,
        files: attachments.length > 0 ? attachments.map((path) => ({ field: "attachment", path })) : undefined,
      });
      printData(validated(data, TemplateGetResponse), resolveFormat(program));
    });

  cmd.command("update")
    .description("Update a template")
    .usage("--id <id> [--from-json <path>] [--starred <bool>] [--attachments <paths>] [--remove-attachments <names>]")
    .requiredOption("--id <id>", "Template ID")
    .option("--from-json <path>", "Read request body from JSON file")
    .option("--starred <bool>", "Starred (true/false)")
    .option("--attachments <paths>", "Comma-separated new file paths to attach (max 3 total including existing)", csvArr)
    .option("--remove-attachments <names>", "Comma-separated existing attachment names to remove", csvArr)
    .addHelpText("after", `
Examples:
  salesblink templates update --id <id> --from-json <path>
  salesblink templates update --id <id> --attachments ./file.pdf --remove-attachments old.pdf

JSON file (--from-json):
  {
    "name": "string",
    "subject_line": "string",
    "content": "<p>Hello</p>",
    "starred": true
  }

Note: --from-json accepts the full request body and overrides other flags. Attachments and remove_attachments must be passed via flags, not inside the JSON body.
`)
    .action(async (opts) => {
      const client = makeClient(program);
      let raw = opts.fromJson ? loadJson(opts.fromJson) : {};
      if (opts.starred !== undefined && !opts.fromJson) {
          raw.starred = boolOpt(opts.starred);
      }
      if (opts.removeAttachments) {
        raw.remove_attachments = opts.removeAttachments;
      }
      const body = validateBody(raw, TemplateUpdateBody);
      const attachments = opts.attachments ?? [];
      if (attachments.length > 3) {
        throw new CliError("Maximum 3 attachments allowed");
      }
      const data = await client.request({
        method: "PATCH",
        path: `/templates/${opts.id}`,
        body,
        files: attachments.length > 0 ? attachments.map((path) => ({ field: "attachment", path })) : undefined,
      });
      printData(validated(data, TemplateGetResponse), resolveFormat(program));
    });

  cmd.command("archive")
    .description("Archive or unarchive a template")
    .usage("--id <id> --archived <bool>")
    .requiredOption("--id <id>", "Template ID")
    .requiredOption("--archived <bool>", "true to archive, false to unarchive")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody({ archived: boolOpt(opts.archived) }, ArchiveBody);
      const data = await client.request({ method: "PUT", path: `/templates/${opts.id}/archive`, body });
      printData(validated(data, OkResponseSchema), resolveFormat(program));
    });
}
