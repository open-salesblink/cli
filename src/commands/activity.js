import { printData } from "../output.js";
import { validated } from "../schemas/validate.js";
import { makeClient, resolveFormat, toTimestamp } from "./_helpers.js";
import { ActivityResponse, ReportsResponse } from "../schemas/activity.schema.js";

function activityOpts(cmd) {
  return cmd
    .option("--per-page <n>", "Page size", parseInt)
    .option("--page <n>", "Page number", parseInt)
    .option("--sequence-id <id>", "Filter by sequence")
    .option("--recipient-email <email>", "Filter by recipient email")
    .option("--since <date>", "Since date (Unix ms or ISO 8601)")
    .option("--from <date>", "From date (Unix ms or ISO 8601)")
    .option("--to <date>", "To date (Unix ms or ISO 8601)")
    .option("--owned-by <email>", "Filter by owner email");
}

function registerActivity(program, name, path, description) {
  const group = program.command(name).description(description);
  activityOpts(group.command("list").description(`Get ${name} activity`)
    .usage("[options]")
    .addHelpText("after", `
Note: date options accept Unix ms or ISO 8601; the CLI converts ISO strings to milliseconds before sending.

To view the full API response, append --format json to your command.
`)
  ).action(async (opts) => {
    const client = makeClient(program);
    const data = await client.request({
      path,
      params: {
        per_page: opts.perPage, page: opts.page, sequence_id: opts.sequenceId,
        recipient_email_address: opts.recipientEmail, since: toTimestamp(opts.since), from: toTimestamp(opts.from), to: toTimestamp(opts.to),
        owned_by: opts.ownedBy,
      },
    });
    printData(validated(data, ActivityResponse), resolveFormat(program));
  });
}

export function registerActivityCommands(program) {
  registerActivity(program, "sent", "/sent", "Sent-activity feed");
  registerActivity(program, "opens", "/opens", "Open-activity feed");
  registerActivity(program, "clicks", "/clicks", "Click-activity feed");
  registerActivity(program, "replies", "/replies", "Reply-activity feed");

  const reports = program.command("reports").description("Aggregate reports");
  reports.command("list")
    .description("Get reports")
    .usage("[options]")
    .addHelpText("after", `
Note: this endpoint uses skip-based pagination (0-based), not a raw skip offset. Date options accept Unix ms or ISO 8601.

To view the full API response, append --format json to your command.
`)
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Page number (0-based)", parseInt)
    .option("--from <date>", "From date (Unix ms or ISO 8601)")
    .option("--to <date>", "To date (Unix ms or ISO 8601)")
    .option("--type <type>", "Filter by log type, e.g. 'outreach'")
    .option("--sequence <id>", "Filter by sequence ID")
    .option("--node <id>", "Filter by node/template ID")
    .option("--email <email>", "Filter by recipient email")
    .option("--sender <id>", "Filter by sender ID")
    .option("--message <msg>", "Filter by log message, e.g. 'Sent'")
    .option("--sort-by <field>", "Sort field")
    .option("--sort-type <type>", "Sort direction: asc or desc")
    .option("--owned-by <email>", "Filter by owner email")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/reports",
        params: {
          limit: opts.limit, skip: opts.skip,
          from: toTimestamp(opts.from), to: toTimestamp(opts.to),
          type: opts.type, sequence: opts.sequence, node: opts.node,
          email: opts.email, sender: opts.sender, message: opts.message,
          sortBy: opts.sortBy, sortType: opts.sortType,
          owned_by: opts.ownedBy,
        },
      });
      printData(validated(data, ReportsResponse), resolveFormat(program));
    });
}
