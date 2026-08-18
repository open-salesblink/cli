# @salesblink/cli

[![npm version](https://img.shields.io/npm/v/@salesblink/cli.svg)](https://www.npmjs.com/package/@salesblink/cli)
[![npm downloads](https://img.shields.io/npm/dm/@salesblink/cli.svg)](https://www.npmjs.com/package/@salesblink/cli)
[![CI](https://github.com/open-salesblink/cli/actions/workflows/ci.yml/badge.svg)](https://github.com/open-salesblink/cli/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/open-salesblink/cli)](https://github.com/open-salesblink/cli/releases/latest)
[![node >=20](https://img.shields.io/node/v/@salesblink/cli.svg)](https://www.npmjs.com/package/@salesblink/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Command-line interface for the [SalesBlink](https://salesblink.io) cold-email outreach platform. Wraps the SalesBlink Public API for use in terminals, scripts, CI/CD pipelines, and AI-assisted workflows.

## Installation

### [npm](https://www.npmjs.com/package/@salesblink/cli) (recommended)

```bash
npm install -g @salesblink/cli
```

### npx (no install)

```bash
npx @salesblink/cli sequences list
```

### Binary download

Standalone binaries for every release are available on [GitHub Releases](https://github.com/open-salesblink/cli/releases/latest):

| Platform | Binary |
|---|---|---|
| macOS Apple Silicon | `salesblink-macos-arm64` |
| macOS Intel | `salesblink-macos-x64` |
| Linux x64 | `salesblink-linux-x64` |
| Windows x64 | `salesblink-win-x64.exe` |

## Quick Start

```bash
# 1. Set your API key (stored in ~/.salesblink/config.json)
salesblink config set api_key sb-xxxxxxxxxxxxxxxx

# 2. List your sequences (campaigns)
salesblink sequences list

# 3. Get sequence stats
salesblink sequences stats --id <sequence-id>

# 4. List leads in a list, export as CSV
salesblink lists leads --id <list-id> --format csv > leads.csv
```

Get your API key at <https://run.salesblink.io/account/integration/api>.

## Authentication

The CLI resolves your API key in this order:

| Priority | Method | Example |
|---|---|---|
| 1 | `--api-key` flag | `salesblink --api-key sb-xxx sequences list` |
| 2 | Config file | `salesblink config set api_key sb-xxx` |

The config file is stored at `~/.salesblink/config.json` with `0600` permissions.

> SalesBlink expects the **raw** key in the `Authorization` header (no `Bearer` prefix, no query param) — the CLI handles this for you.

```bash
salesblink config set api_key sb-xxxxxxxxxxxxxxxx
salesblink config get api_key
salesblink config clear
```

## Output Formats

The CLI auto-detects the best output format:

- **Table** when stdout is a TTY (interactive terminal)
- **JSON** when stdout is piped

Override with `--format`:

```bash
salesblink sequences list --format json          # JSON (default when piped)
salesblink sequences list | jq '.data[].name'     # pipe to jq
salesblink sequences list --format table          # table (default in terminal)
salesblink sequences list --format csv > seq.csv  # CSV for spreadsheets
```

The standard SalesBlink response envelope `{ success, data, message }` is automatically unwrapped for table/CSV output, so the payload rows are what you see. JSON output always preserves the full envelope.

All data goes to **stdout**, all errors and warnings go to **stderr**.

## Validation

All request bodies and responses are validated with **strict zod schemas** derived from the SalesBlink OpenAPI spec. Invalid bodies are rejected client-side before any network call:

```bash
$ salesblink sequences status --id 123 --status bogus
Error: Invalid request body: status: Invalid enum value. Expected 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ARCHIVED'...
```

Where the OpenAPI spec does not define a response shape, the CLI validates the `{ success, data, message }` envelope and **passes through** unknown fields (never silently drops them).

## Rate Limits

The SalesBlink API uses tiered rate limiting:

| Tier | Limit | Methods |
|---|---|---|
| General | 30 / min | GET |
| Sensitive | 15 / min | POST, PATCH |
| Restricted | 10 / min | PUT, DELETE |

Pass `--retry` to automatically back off and retry on HTTP 429 with exponential backoff (honors the `Retry-After` header):

```bash
salesblink --retry sequences list
```

## Command Reference

Date options accept either a **Unix timestamp in milliseconds** or an **ISO 8601 datetime string** (e.g. `2026-07-22T14:17:00-04:00`); the CLI converts ISO strings to milliseconds before sending.

### config

```
salesblink config set <key> <value>    Set a configuration value (api_key, base_url, format)
salesblink config get <key>            Get a configuration value
salesblink config list                 Show all configuration values
salesblink config clear                Clear all configuration
```

### lists

```
salesblink lists list [--limit N] [--skip N] [--search Q] [--folder ID] [--integration NAME] [--sort-by FIELD] [--sort-type asc|desc]
salesblink lists get --id ID
salesblink lists create --name NAME [--folder F] [--starred] [--verification] [--archive-invalid] [--archive-risky] | --from-json file.json
salesblink lists update --id ID [--name NAME] [--starred true|false] [--verification true|false] [--archive-invalid true|false] [--archive-risky true|false] | --from-json file.json
salesblink lists archive --id ID --archived true|false
salesblink lists leads --id ID [--limit N] [--skip N] [--search Q] [--archived true|false] [--sort asc|desc] [--sequence ID] [--status STATUS]
```

### leads

```
salesblink leads update --id ID [--email E] [--first-name N] [--last-name N] | --from-json file.json
salesblink leads move --id ID --list-id LIST_ID
salesblink leads add --list-id ID --from-json contacts.json
salesblink leads remove --list-id ID --email user@example.com
salesblink leads archive --id ID --archived true|false
```

### sequences (campaigns)

```
salesblink sequences list [--limit N] [--skip N] [--search Q] [--status running|paused|completed|needs-attention] [--folder ID] [--send-all] [--sort-by FIELD] [--sort-type asc|desc]
salesblink sequences get --id ID
salesblink sequences create --name N --senders IDS --list-id IDS --from-json steps.json [--paused false] [options]
salesblink sequences update --id ID [--paused true|false] [--from-json update.json] [options]
salesblink sequences archive --id ID --archived true|false
salesblink sequences clone --id ID
salesblink sequences stats --id ID [--from DATE] [--to DATE] [--sender EMAIL]
salesblink sequences export --id ID [--limit N] [--output PATH]
salesblink sequences status --id ID --status ACTIVE|PAUSED|STOPPED|ARCHIVED
salesblink sequences leads --id ID [--limit N] [--skip N]
salesblink sequences lead-messages --id ID --lead-id LEAD_ID
salesblink sequences unsubscribe-lead --id ID --lead-id LEAD_ID
```

Create/update options include: scheduling (`--launch-timing-mode`, `--scheduled-at`, `--timezone`), delay windows (`--delay-enabled`, `--delay-from`, `--delay-to`), reply handling (`--stop-when-reply-received`, `--stop-when-reply-received-when`), and outbox approval (`--check-email-before-sending`). Advanced fields are available via `--from-json`.

Sequences are created `paused: true` by default. Pass `--paused false` during create (or `sequences update --id ID --paused false` later) to schedule contacts and populate the lead count.

### templates

```
salesblink templates list [--limit N] [--skip N] [--search Q] [--folder ID] [--type TYPE] [--task-type TYPE] [--include-tests] [--sort-by FIELD] [--sort-type asc|desc]
salesblink templates get --id ID
salesblink templates create --name N --subject S --content HTML [--folder F] [--attachments PATH1,PATH2,PATH3] | --from-json t.json
salesblink templates update --id ID [--from-json update.json] [--attachments PATH1,PATH2,PATH3] [--remove-attachments NAME1,NAME2]
salesblink templates archive --id ID --archived true|false
```

### senders

```
salesblink senders list [--limit N] [--skip N] [--search Q] [--folder ID] [--filter STRING]
salesblink senders add --email E [--from-json sender.json]
salesblink senders add --google     # prints OAuth URL; paste in browser to connect Gmail
salesblink senders add --outlook    # prints OAuth URL; paste in browser to connect Outlook
salesblink senders bulk --file senders.csv
salesblink senders update --id ID --from-json warmup.json
salesblink senders reconnect --id ID
salesblink senders health --id ID
salesblink senders warmup-stats --id ID [--days N]
salesblink senders fetch-messages --id ID
salesblink senders fetch-messages-multi --ids ID1,ID2,... | --from-json ids.json
salesblink senders warmup-links [--owned-by EMAIL]
```

### inbox

```
salesblink inbox list [--type draft|scheduled|sent] [--sequence ID] [--search Q] [--date START-END] [--sender ID] [--limit N] [--skip N]
salesblink inbox thread --message-id ID
salesblink inbox update --message-id ID [--unread true|false] [--outcome O]
salesblink inbox reply --message-id ID --content HTML [--content-file PATH] [--cc E] [--bcc E]
salesblink inbox forward --message-id ID [--email E] [--content HTML] [--content-file PATH] [--cc E] [--bcc E]
```

### inbox-placement (deliverability tests)

```
salesblink inbox-placement list [--limit N] [--skip N] [--owned-by EMAIL]
salesblink inbox-placement create --name NAME --mode one-time|recurring --source from-salesblink|from-outside [--content-type custom|sequence|template] [--sender-id ID] [--email-senders PATH] [--subject S] [--body HTML] [--sequence-id ID] [--template-id ID] [--schedule-day 0-6] [--plain-text] [--from-json PATH]
salesblink inbox-placement pause --id ID
salesblink inbox-placement delete --id ID --confirm
```

### blocklist

Emails and domains on the blocklist will not receive outreach. Uses the unsubscribe API behind the scenes.

```
salesblink blocklist list [--limit N] [--skip N] [--search Q] [--type email|domain]
salesblink blocklist add [--emails A,B] [--domains A,B] | --from-json file.json
salesblink blocklist remove [--emails A,B] | --from-json file.json
salesblink blocklist delete --id ID
salesblink blocklist delete-all --confirm
salesblink blocklist check --email user@example.com
```

### analytics

```
salesblink analytics overall [--from DATE] [--to DATE]
salesblink analytics daily [--from DATE] [--to DATE] [--timezone TZ]
salesblink analytics lead-stats [--from DATE] [--to DATE] [--limit N] [--skip N]
salesblink analytics mailbox-stats [--from DATE] [--to DATE] [--limit N] [--skip N]
```

### activity feeds

```
salesblink sent    list [--per-page N] [--page N] [--sequence-id ID] [--recipient-email E] [--since DATE] [--from DATE] [--to DATE]
salesblink opens   list [...same filters...]
salesblink clicks  list [...same filters...]
salesblink replies list [...same filters...]
```

### reports

```
salesblink reports list [--limit N] [--skip N] [--from DATE] [--to DATE] [--type TYPE] [--sequence ID] [--node ID] [--email EMAIL] [--sender ID] [--message MSG] [--sort-by FIELD] [--sort-type asc|desc]
```

### folders

```
salesblink folders list [--search Q]
salesblink folders create --name NAME
```

### domains / signatures

```
salesblink domains list [--owned-by EMAIL]
salesblink domains search --keyword KW
salesblink signatures list [--owned-by EMAIL]
```

### users

```
salesblink users list
salesblink users get --id ID
salesblink users add --email E [--role client|user|admin|developer] [--url URL]
salesblink users update --id ID [--name N] [--role R] | --from-json u.json
```

### workspaces

```
salesblink workspaces list
salesblink workspaces create --name NAME
salesblink workspaces update --id ID --name NAME
```

### keys (API keys)

```
salesblink keys list
salesblink keys create --name NAME
salesblink keys refresh --id ID
salesblink keys delete --id ID --confirm
```

### auth (OAuth + signup + login link)

```
salesblink auth google
salesblink auth outlook
salesblink auth signup --email E --password P --name N
salesblink auth verify
salesblink auth login-link [--redirect-url PATH] [--expiry-minutes N]
```

> `google` and `outlook` print the OAuth URL to stdout. The API ignores any custom redirect URL; open the returned URL in a browser.

### billing

```
salesblink billing add-card        # returns the add-card login link
salesblink billing remove-card     # returns the remove-card login link
```

### dfy (Done-For-You mailbox orders)

```
salesblink dfy orders
salesblink dfy place-order --type google|outlook|azure --from-json order.json
salesblink dfy add-mailbox --order-id ID [--domain-name DOMAIN] [--from-json mailbox.json]
salesblink dfy cancel-mailbox --order-id ID --mailbox-id ID --confirm
```

`dfy add-mailbox` expects an `emails` array of mailbox objects. Use `--from-json` for this request body:

```json
{
  "domainName": "example.com",
  "emails": [
    { "username": "jane", "firstName": "Jane", "lastName": "Doe" }
  ]
}
```

## `--from-json` pattern

Complex create/update bodies (sequences with steps, senders, bulk imports) are easiest via a JSON file:

```json
// sequence.json
{
  "name": "Q1 Outbound",
  "senders": "sender-id-1",
  "lists": ["list-id-1"],
  "steps": [
    { "type": "email", "template_id": "tmpl-id-1" },
    { "type": "delay", "days": 3 }
  ]
}
```

```bash
salesblink sequences create --from-json sequence.json
```

## Usage in Scripts and Cron Jobs

JSON output when piped, stable exit codes, all errors on stderr.

```bash
#!/bin/bash
set -euo pipefail

salesblink config set api_key sb-xxxxxxxxxxxxxxxx

salesblink sequences list --format json | jq -r '.data[].id' | while read id; do
  echo "--- $id ---"
  salesblink sequences stats --id "$id" --format json
done
```

Nightly lead export:

```cron
0 2 * * * salesblink lists leads --id LIST_ID --format csv > /data/leads-$(date +\%F).csv
```

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | General error (bad input, validation failure, API error) |
| `2` | Authentication failure (missing or invalid API key) |
| `3` | Resource not found (404) |
| `4` | Rate limited (429) — re-run with `--retry` |

## Environment Variables

| Variable | Description |
|---|---|
| `NO_COLOR` | Disable table borders/formatting |

## Requirements

- Node.js 20+ (for npm install)
- No runtime dependencies for standalone binaries

## Development

No build step — the package runs directly from `src/*.js` via native ESM.

```bash
npm install
npm run check          # syntax-check every source file (node --check)
npm test               # unit + end-to-end tests (node:test, no extra dependencies)
node src/index.js --help
```

## Trademark

"SalesBlink" and the SalesBlink logo are trademarks of FUTUREBLINK Inc. The MIT license grants rights to the code only — it does not grant any rights to use the SalesBlink name, logo, or trademarks, except as required for reasonable and customary use in describing the origin of the software.

## License

MIT — see [LICENSE](LICENSE).
