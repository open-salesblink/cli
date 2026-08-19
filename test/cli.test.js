import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const entry = join(root, "src", "index.js");

/** Run the CLI with an isolated HOME so tests never touch real credentials. */
function runCli(args, { home } = {}) {
  const fakeHome = home ?? mkdtempSync(join(tmpdir(), "sb-cli-e2e-"));
  const result = spawnSync(process.execPath, [entry, ...args], {
    encoding: "utf8",
    env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome, NO_COLOR: "1" },
    timeout: 30000,
  });
  return { ...result, home: fakeHome };
}

test("--help exits 0 and describes the CLI", () => {
  const { status, stdout } = runCli(["--help"]);
  assert.equal(status, 0);
  assert.match(stdout, /CLI for the SalesBlink cold-email outreach platform/);
});

test("--version exits 0 and prints the version", () => {
  const { status, stdout } = runCli(["--version"]);
  assert.equal(status, 0);
  assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("commands requiring auth exit 2 with a helpful message when no key is set", () => {
  const { status, stderr } = runCli(["sequences", "list"]);
  assert.equal(status, 2);
  assert.match(stderr, /API key required/);
  assert.match(stderr, /salesblink config set api_key/);
});

test("config set/get/list/clear round-trips values", () => {
  const home = mkdtempSync(join(tmpdir(), "sb-cli-e2e-"));

  const set = runCli(["config", "set", "api_key", "sb-e2e-test-key", "--no-verify"], { home });
  assert.equal(set.status, 0);
  assert.match(set.stderr, /Set api_key \*\*\*\*-key/);
  assert.match(set.stderr, /saved to ~\/\.salesblink\/config\.json/);
  assert.doesNotMatch(set.stderr, /sb-e2e-test-key/);

  const get = runCli(["config", "get", "api_key"], { home });
  assert.equal(get.status, 0);
  assert.match(get.stdout, /sb-e2e-test-key/);

  const list = runCli(["config", "list"], { home });
  assert.equal(list.status, 0);
  assert.match(list.stdout, /sb-e2e-test-key/);

  const clear = runCli(["config", "clear"], { home });
  assert.equal(clear.status, 0);

  const gone = runCli(["config", "get", "api_key"], { home });
  assert.equal(gone.status, 1);
  assert.match(gone.stderr, /not set/);
});

test("config file is written with owner-only (0600) permissions", () => {
  const home = mkdtempSync(join(tmpdir(), "sb-cli-e2e-"));
  const { status } = runCli(["config", "set", "api_key", "sb-perms-check", "--no-verify"], { home });
  assert.equal(status, 0);

  const configPath = join(home, ".salesblink", "config.json");
  const mode = statSync(configPath).mode & 0o777;
  assert.equal(mode, 0o600);
  assert.deepEqual(JSON.parse(readFileSync(configPath, "utf8")), { api_key: "sb-perms-check" });
});

test("config set api_key --no-verify masks the key and skips the network check", () => {
  const { status, stderr } = runCli(["config", "set", "api_key", "sb-secret-key-1234", "--no-verify"]);
  assert.equal(status, 0);
  assert.match(stderr, /Set api_key \*\*\*\*1234/);
  assert.doesNotMatch(stderr, /sb-secret-key-1234/);
});

test("config set of a non-secret key echoes the value", () => {
  const { status, stderr } = runCli(["config", "set", "format", "json"]);
  assert.equal(status, 0);
  assert.match(stderr, /Set format = json/);
  assert.match(stderr, /saved to ~\/\.salesblink\/config\.json/);
});

test("invalid request bodies are rejected client-side with exit 1 (no network call)", () => {
  // lists create without --name: zod requires `name` — fails before any HTTP request.
  const { status, stderr } = runCli(["--api-key", "sb-x", "lists", "create"]);
  assert.equal(status, 1);
  assert.match(stderr, /Invalid request body/);
  assert.match(stderr, /name/);
});

test("invalid enum values are rejected client-side", () => {
  const { status, stderr } = runCli(["--api-key", "sb-x", "sequences", "status", "--id", "123", "--status", "bogus"]);
  assert.equal(status, 1);
  assert.match(stderr, /Invalid enum value/);
});

test("unknown commands exit non-zero with an error on stderr", () => {
  const { status, stderr } = runCli(["frobnicate"]);
  assert.equal(status, 1);
  assert.match(stderr, /error/i);
});

test("every documented command group appears in --help", () => {
  const { stdout } = runCli(["--help"]);
  for (const group of [
    "config", "lists", "leads", "sequences", "templates", "senders", "inbox",
    "blocklist", "analytics", "inbox-placement", "sent", "opens", "clicks",
    "replies", "reports", "folders", "domains", "signatures", "users",
    "workspaces", "keys", "auth", "billing", "dfy",
  ]) {
    assert.match(stdout, new RegExp(`\\b${group}\\b`), `missing command group: ${group}`);
  }
});
