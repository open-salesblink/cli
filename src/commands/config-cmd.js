import { getConfigValue, setConfigValue, clearConfig, readConfig } from "../config.js";
import { printData, printError } from "../output.js";
import { CliError, EXIT_AUTH, maskApiKey } from "../client.js";
import { makeClient } from "./_helpers.js";

export function registerConfigCommand(program) {
  const config = program.command("config").description("Manage CLI configuration");

  config
    .command("set <key> <value>")
    .description("Set a configuration value (api_key, base_url, format)")
    .usage("<key> <value> [--no-verify]")
    .option("--no-verify", "Skip API key verification when setting api_key")
    .addHelpText("after", `
Keys:
  api_key    SalesBlink API key (verified against the API unless --no-verify)
  base_url   Override the default API base URL
  format     Default output format: json, table, csv

When setting api_key, the key is verified with a call to /account/verify.
The key is saved even if verification fails; the command exits non-zero so
scripts can detect a bad key. Use --no-verify to skip the check (e.g. offline).
`)
    .action(async (key, value, opts) => {
      setConfigValue(key, value);
      const saved = key === "api_key" ? `Set api_key ${maskApiKey(value)}` : `Set ${key} = ${value}`;
      process.stderr.write(`${saved} (saved to ~/.salesblink/config.json)\n`);

      // commander turns --no-verify into opts.verify === false
      if (key !== "api_key" || opts.verify === false) return;

      try {
        const client = makeClient(program);
        const data = await client.request({ path: "/account/verify" });
        const account = data?.data?.email ?? data?.data?.name ?? data?.data?.org;
        process.stderr.write(`API key verified.${account ? ` (account: ${account})` : ""}\n`);
      } catch (err) {
        if (err instanceof CliError && err.exitCode === EXIT_AUTH) {
          process.stderr.write(`API key saved, but verification failed: ${err.message}\n`);
          process.exitCode = EXIT_AUTH;
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`API key saved. Verification skipped: ${msg}\n`);
      }
    });

  config
    .command("get <key>")
    .description("Get a configuration value")
    .usage("<key>")
    .addHelpText("after", `
Keys:
  api_key    SalesBlink API key
  base_url   Override the default API base URL
  format     Default output format: json, table, csv

To view the full API response, append --format json to your command.
`)
    .action((key) => {
      const format = program.opts()["format"];
      const value = getConfigValue(key);
      if (value === undefined) {
        printError(`Key "${key}" is not set`);
        process.exit(1);
      }
      printData({ [key]: value }, format ?? "json");
    });

  config
    .command("list")
    .description("Show all configuration values")
    .usage("[options]")
    .addHelpText("after", "To view the full API response, append --format json to your command.\n")
    .action(() => {
      const format = program.opts()["format"];
      printData(readConfig(), format ?? "json");
    });

  config
    .command("clear")
    .description("Clear all configuration")
    .usage("[options]")
    .addHelpText("after", "Clears all saved configuration values.\n")
    .action(() => {
      clearConfig();
      process.stderr.write("Configuration cleared\n");
    });
}
