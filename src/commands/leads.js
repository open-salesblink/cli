import { printData } from "../output.js";
import { validated, validateBody, OkResponseSchema } from "../schemas/validate.js";
import { makeClient, resolveFormat, loadJson, pick, boolOpt } from "./_helpers.js";
import {
  LeadUpdateBody, LeadMoveBody, ContactsAddBody, ContactsRemoveBody, ArchiveBody,
  LeadGetResponse, ContactsMutateResponse,
} from "../schemas/lists.schema.js";
import {
  LeadActivityResponse, LeadSequenceMessagesResponse, LeadUnsubscribeResponse,
} from "../schemas/leads.schema.js";

export function registerLeadsCommand(program) {
  const cmd = program.command("leads").description("Manage leads and contacts");

  cmd.command("update")
    .description("Update a lead")
    .usage("--id <id> [--email <email>] [--first-name <name>] [--last-name <name>] [--phone <phone>] [--company <company>] [--title <title>] | --from-json <path>")
    .requiredOption("--id <id>", "Lead/contact ID")
    .option("--email <email>", "Email")
    .option("--first-name <name>", "First name")
    .option("--last-name <name>", "Last name")
    .option("--phone <phone>", "Phone")
    .option("--company <company>", "Company")
    .option("--title <title>", "Title")
    .option("--from-json <path>", "Read request body from JSON file")
    .addHelpText("after", `\nExamples:\n  salesblink leads update --id <id> --email <email>\n  salesblink leads update --id <id> --from-json <path>\n\nJSON file (--from-json):\n  {\n    "Email": "string",\n    "First_Name": "string",\n    "Last_Name": "string",\n    "Phone": "string",\n    "Company": "string",\n    "Title": "string"\n  }\n\nNote: --from-json accepts the full request body and overrides other flags.\n`)
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson
        ? loadJson(opts.fromJson)
        : pick({
            Email: opts.email, First_Name: opts.firstName, Last_Name: opts.lastName,
            Phone: opts.phone, Company: opts.company, Title: opts.title,
          });
      const body = validateBody(raw, LeadUpdateBody);
      const data = await client.request({ method: "PATCH", path: `/leads/${opts.id}`, body });
      printData(validated(data, LeadGetResponse), resolveFormat(program));
    });

  cmd.command("move")
    .description("Move a lead to another list")
    .usage("--id <id> --list-id <id>")
    .requiredOption("--id <id>", "Lead/contact ID")
    .requiredOption("--list-id <id>", "Target list ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody({ list_id: opts.listId }, LeadMoveBody);
      const data = await client.request({ method: "PUT", path: `/leads/${opts.id}/move`, body });
      printData(validated(data, OkResponseSchema), resolveFormat(program));
    });

  cmd.command("add")
    .description("Add leads/contacts to a list")
    .usage("--list-id <id> [--remove-duplicates] | --from-json <path>")
    .requiredOption("--list-id <id>", "List ID")
    .option("--remove-duplicates", "Remove duplicates")
    .option("--from-json <path>", "JSON file: { list_id, contacts: [...] }")
    .addHelpText("after", `\nExamples:\n  salesblink leads add --list-id <id> --remove-duplicates\n  salesblink leads add --from-json <path>\n\nJSON file (--from-json):\n  {\n    "list_id": "string",\n    "remove_duplicates": true,\n    "contacts": [\n      { "Email": "string", "First_Name": "string", "Last_Name": "string" }\n    ]\n  }\n\nNote: --from-json accepts the full request body and overrides other flags.\n`)
    .action(async (opts) => {
      const client = makeClient(program);
      const raw = opts.fromJson
        ? loadJson(opts.fromJson)
        : { list_id: opts.listId, contacts: [], remove_duplicates: opts.removeDuplicates };
      const body = validateBody(raw, ContactsAddBody);
      const data = await client.request({ method: "POST", path: "/contacts", body });
      printData(validated(data, ContactsMutateResponse), resolveFormat(program));
    });

  cmd.command("remove")
    .description("Remove a lead from a list by email")
    .usage("--list-id <id> --email <email>")
    .requiredOption("--list-id <id>", "List ID")
    .requiredOption("--email <email>", "Lead email")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody({ list_id: opts.listId, email: opts.email }, ContactsRemoveBody);
      const data = await client.request({ method: "POST", path: "/contacts/remove", body });
      printData(validated(data, ContactsMutateResponse), resolveFormat(program));
    });

  cmd.command("archive")
    .description("Archive or unarchive a contact")
    .usage("--id <id> --archived <bool>")
    .requiredOption("--id <id>", "Contact ID")
    .requiredOption("--archived <bool>", "true to archive, false to unarchive")
    .action(async (opts) => {
      const client = makeClient(program);
      const body = validateBody({ archived: boolOpt(opts.archived) }, ArchiveBody);
      const data = await client.request({ method: "PUT", path: `/contacts/${opts.id}/archive`, body });
      printData(validated(data, OkResponseSchema), resolveFormat(program));
    });

  cmd.command("activity")
    .description("Get lead activity by email")
    .usage("--email <email>")
    .requiredOption("--email <email>", "Lead email")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: "/leads/activity", params: { email: opts.email } });
      printData(validated(data, LeadActivityResponse), resolveFormat(program));
    });

  cmd.command("activity-by-id")
    .description("Get activity for a lead by ID")
    .usage("--id <id>")
    .requiredOption("--id <id>", "Lead ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: `/leads/${opts.id}/activity` });
      printData(validated(data, LeadActivityResponse), resolveFormat(program));
    });

  cmd.command("unsubscribe")
    .description("Globally unsubscribe a lead")
    .usage("--id <id>")
    .requiredOption("--id <id>", "Lead ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ method: "POST", path: `/leads/${opts.id}/unsubscribe` });
      printData(validated(data, LeadUnsubscribeResponse), resolveFormat(program));
    });

  cmd.command("sequence-leads")
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

  cmd.command("messages")
    .description("Get message history for a lead in a sequence")
    .usage("--id <id> --lead-id <leadId>")
    .requiredOption("--id <id>", "Sequence ID")
    .requiredOption("--lead-id <leadId>", "Lead ID")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({ path: `/sequences/${opts.id}/leads/${opts.leadId}/messages` });
      printData(validated(data, LeadSequenceMessagesResponse), resolveFormat(program));
    });

  cmd.command("unsubscribe-from-sequence")
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
