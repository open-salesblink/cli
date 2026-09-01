import { getConfigValue, setConfigValue, clearConfig, readConfig } from "../config.js";
import { printData, printError } from "../output.js";

export function registerConfigCommand(program) {
  const config = program.command("config").description("Manage CLI configuration");

  config
    .command("set <key> <value>")
    .description("Set a configuration value (api_key, base_url, format)")
    .usage("<key> <value>")
    .addHelpText("after", `
Keys:
  api_key    SalesBlink API key
  base_url   Override the default API base URL
  format     Default output format: json, table, csv
`)
    .action((key, value) => {
      setConfigValue(key, value);
      process.stderr.write(`Set ${key}\n`);
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
