# Security Policy

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report vulnerabilities privately via GitHub's private vulnerability reporting:

<https://github.com/open-salesblink/cli/security/advisories/new>

Alternatively, email **security@salesblink.io** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof of concept
- Affected version(s)

We aim to acknowledge reports within **3 business days** and provide a status update within **7 business days**. We will credit reporters in the release notes unless you prefer to remain anonymous.

## Supported Versions

Only the latest published release receives security fixes.

| Version | Supported |
|---|---|
| Latest on npm (`@salesblink/cli`) | ✅ |
| Older versions | ❌ — upgrade to latest |

## API Key Handling

This CLI handles SalesBlink API keys. Please keep the following in mind:

- **Never commit your API key.** Keys should only live in `~/.salesblink/config.json`, the `--api-key` flag, or your shell environment — never in source control or shared scripts.
- **Config file permissions.** The CLI writes `~/.salesblink/config.json` with `0600` (owner-only) permissions and warns at runtime if the file becomes world-readable. Do not loosen these permissions.
- **Shell history.** Passing `--api-key` (or `auth signup --password`) directly on the command line may record the secret in your shell history. Prefer `salesblink config set api_key <key>` in an interactive session, and configure your shell to ignore commands prefixed with a space (`HISTCONTROL=ignorespace` in bash, `setopt HIST_IGNORE_SPACE` in zsh) for extra safety.
- **Key masking.** The CLI masks API keys in error output (only the last 4 characters are shown). If you ever see a full key in CLI output, please report it as a security issue.
- **Rotate compromised keys** immediately at <https://run.salesblink.io/account/integration/api> or via `salesblink keys refresh --id <id>`.

## Scope

This policy covers the `@salesblink/cli` package and this repository. Vulnerabilities in the SalesBlink platform or API itself should be reported to **security@salesblink.io** directly.
