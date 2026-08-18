#!/usr/bin/env node

import { Command } from "commander";
import { CliError } from "./client.js";
import { detectFormat, printError } from "./output.js";
import { registerConfigCommand } from "./commands/config-cmd.js";
import { registerListsCommand } from "./commands/lists.js";
import { registerLeadsCommand } from "./commands/leads.js";
import { registerSequencesCommand } from "./commands/sequences.js";
import { registerTemplatesCommand } from "./commands/templates.js";
import { registerSendersCommand } from "./commands/senders.js";
import { registerInboxCommand } from "./commands/inbox.js";

import { registerBlocklistCommand } from "./commands/blocklist.js";
import { registerAnalyticsCommand } from "./commands/analytics.js";

import { registerActivityCommands } from "./commands/activity.js";
import { registerInboxPlacementCommand } from "./commands/inbox-placement.js";
import { registerFoldersCommand, registerDomainsCommand, registerSignaturesCommand } from "./commands/org.js";
import { registerUsersCommand, registerWorkspacesCommand, registerKeysCommand } from "./commands/admin.js";
import { registerAuthCommand, registerBillingCommand, registerDfyCommand } from "./commands/misc.js";

const program = new Command();

program
  .name("salesblink")
  .description("CLI for the SalesBlink cold-email outreach platform")
  .version("0.1.0")
  .option("--api-key <key>", "SalesBlink API key")
  .option("--base-url <url>", "Override API base URL")
  .option("--format <format>", "Output format: json, table, csv")
  .option("--quiet", "Suppress non-essential output")
  .option("--retry", "Automatically retry on 429 rate-limit with exponential backoff");

registerConfigCommand(program);
registerListsCommand(program);
registerLeadsCommand(program);
registerSequencesCommand(program);
registerTemplatesCommand(program);
registerSendersCommand(program);
registerInboxCommand(program);

registerBlocklistCommand(program);
registerAnalyticsCommand(program);

registerActivityCommands(program);
registerInboxPlacementCommand(program);
registerFoldersCommand(program);
registerDomainsCommand(program);
registerSignaturesCommand(program);
registerUsersCommand(program);
registerWorkspacesCommand(program);
registerKeysCommand(program);
registerAuthCommand(program);
registerBillingCommand(program);
registerDfyCommand(program);

export function resolveFormat(opts) {
  const f = opts["format"];
  if (f === "json" || f === "table" || f === "csv") return f;
  return detectFormat();
}

program.exitOverride();

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof CliError) {
      printError(err.message);
      process.exitCode = err.exitCode;
      return;
    }
    if (err instanceof Error) {
      const code = err.code;
      if (code === "commander.helpDisplayed" || code === "commander.help" || code === "commander.version") {
        process.exitCode = 0;
        return;
      }
      printError(err.message);
      process.exitCode = 1;
      return;
    }
    process.exitCode = 1;
  }
}

main();

