import { printData } from "../output.js";
import { validated } from "../schemas/validate.js";
import { makeClient, resolveFormat, toTimestamp } from "./_helpers.js";
import { AnalyticsResponse } from "../schemas/analytics.schema.js";

export function registerAnalyticsCommand(program) {
  const cmd = program.command("analytics").description("Analytics and reporting");

  cmd.command("overall")
    .description("Get overall analytics")
    .usage("[--from <date>] [--to <date>]")
    .option("--from <date>", "Start date (ISO 8601 or timestamp)")
    .option("--to <date>", "End date (ISO 8601 or timestamp)")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/analytics/overall",
        params: { from: toTimestamp(opts.from), to: toTimestamp(opts.to) },
      });
      printData(validated(data, AnalyticsResponse), resolveFormat(program));
    });

  cmd.command("daily")
    .description("Get daily analytics")
    .usage("[--from <date>] [--to <date>] [--timezone <tz>]")
    .option("--from <date>", "Start date (ISO 8601 or timestamp)")
    .option("--to <date>", "End date (ISO 8601 or timestamp)")
    .option("--timezone <tz>", "IANA timezone")
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/analytics/daily",
        params: { from: toTimestamp(opts.from), to: toTimestamp(opts.to), timezone: opts.timezone },
      });
      printData(validated(data, AnalyticsResponse), resolveFormat(program));
    });

  cmd.command("lead-stats")
    .description("Get lead statistics")
    .usage("[--from <date>] [--to <date>] [--limit <n>] [--skip <n>]")
    .option("--from <date>", "Start date (ISO 8601 or timestamp)")
    .option("--to <date>", "End date (ISO 8601 or timestamp)")
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/analytics/lead-stats",
        params: { from: toTimestamp(opts.from), to: toTimestamp(opts.to), limit: opts.limit, skip: opts.skip },
      });
      printData(validated(data, AnalyticsResponse), resolveFormat(program));
    });

  cmd.command("mailbox-stats")
    .description("Get mailbox statistics")
    .usage("[--from <date>] [--to <date>] [--limit <n>] [--skip <n>]")
    .option("--from <date>", "Start date (ISO 8601 or timestamp)")
    .option("--to <date>", "End date (ISO 8601 or timestamp)")
    .option("--limit <n>", "Page size", parseInt)
    .option("--skip <n>", "Offset", parseInt)
    .action(async (opts) => {
      const client = makeClient(program);
      const data = await client.request({
        path: "/analytics/mailbox-stats",
        params: { from: toTimestamp(opts.from), to: toTimestamp(opts.to), limit: opts.limit, skip: opts.skip },
      });
      printData(validated(data, AnalyticsResponse), resolveFormat(program));
    });
}
