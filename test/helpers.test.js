import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { csvArr, pick, toTimestamp, boolOpt, requireConfirm, loadJson } from "../src/commands/_helpers.js";
import { CliError } from "../src/client.js";

test("csvArr splits, trims, and drops empties", () => {
  assert.deepEqual(csvArr("a, b ,,c"), ["a", "b", "c"]);
  assert.deepEqual(csvArr("single"), ["single"]);
  assert.equal(csvArr(undefined), undefined);
  assert.equal(csvArr(null), undefined);
  assert.deepEqual(csvArr(["x"]), ["x"]); // arrays pass through
});

test("pick drops only undefined values", () => {
  assert.deepEqual(pick({ a: 1, b: undefined, c: false, d: null, e: 0 }), { a: 1, c: false, d: null, e: 0 });
  assert.deepEqual(pick({}), {});
});

test("toTimestamp converts ISO strings to milliseconds", () => {
  assert.equal(toTimestamp(undefined), undefined);
  assert.equal(toTimestamp(1753200000000), 1753200000000);
  assert.equal(toTimestamp("1970-01-01T00:00:00.000Z"), 0);
  assert.equal(toTimestamp("2026-07-22T14:17:00-04:00"), Date.parse("2026-07-22T14:17:00-04:00"));
});

test("toTimestamp rejects invalid dates", () => {
  assert.throws(() => toTimestamp("not-a-date"), (err) => err instanceof CliError && /Invalid date/.test(err.message));
});

test("boolOpt parses boolean-ish strings", () => {
  assert.equal(boolOpt("true"), true);
  assert.equal(boolOpt("TRUE"), true);
  assert.equal(boolOpt("1"), true);
  assert.equal(boolOpt("yes"), true);
  assert.equal(boolOpt("false"), false);
  assert.equal(boolOpt("0"), false);
  assert.equal(boolOpt("no"), false);
  assert.equal(boolOpt(true), true);
  assert.equal(boolOpt("bogus"), undefined);
  assert.equal(boolOpt(undefined), undefined);
});

test("requireConfirm throws without --confirm", () => {
  assert.throws(() => requireConfirm(undefined, "delete all blocklist entries"), (err) =>
    err instanceof CliError && /Pass --confirm to delete all blocklist entries/.test(err.message));
  requireConfirm(true, "anything"); // must not throw
});

test("loadJson parses a JSON file", () => {
  const dir = mkdtempSync(join(tmpdir(), "sb-cli-test-"));
  const file = join(dir, "body.json");
  writeFileSync(file, JSON.stringify({ name: "Q1", steps: [1, 2] }));
  assert.deepEqual(loadJson(file), { name: "Q1", steps: [1, 2] });
});

test("loadJson throws CliError on missing or invalid files", () => {
  const dir = mkdtempSync(join(tmpdir(), "sb-cli-test-"));
  assert.throws(() => loadJson(join(dir, "nope.json")), CliError);
  const bad = join(dir, "bad.json");
  writeFileSync(bad, "{ not json");
  assert.throws(() => loadJson(bad), (err) => err instanceof CliError && /Failed to read JSON/.test(err.message));
});
