import { test } from "node:test";
import assert from "node:assert/strict";
import { detectFormat, formatOutput } from "../src/output.js";

const envelope = {
  success: true,
  message: "ok",
  data: [
    { id: "1", name: "Alpha, Inc", contacts_count: 3 },
    { id: "2", name: 'Say "Hi"', contacts_count: 5 },
  ],
};

test("detectFormat returns json when stdout is piped", () => {
  // Under `node --test`, stdout is not a TTY.
  assert.equal(detectFormat(), process.stdout.isTTY ? "table" : "json");
});

test("json format preserves the full envelope", () => {
  const { output } = formatOutput(envelope, "json");
  assert.deepEqual(JSON.parse(output), envelope);
});

test("csv format unwraps the envelope and escapes special chars", () => {
  const { output } = formatOutput(envelope, "csv");
  const lines = output.split("\n");
  assert.equal(lines[0], "id,name,contacts_count");
  assert.equal(lines[1], '1,"Alpha, Inc",3');
  assert.equal(lines[2], '2,"Say ""Hi""",5');
});

test("table format renders headers and rows", () => {
  const { output } = formatOutput(envelope, "table");
  assert.match(output, /id/);
  assert.match(output, /name/);
  assert.match(output, /Alpha, Inc/);
});

test("empty payload produces empty non-JSON output", () => {
  assert.equal(formatOutput({ success: true, data: [] }, "csv").output, "");
  assert.equal(formatOutput({ success: true, data: [] }, "table").output, "");
});

test("table format truncates long simple payloads", () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: String(i) }));
  const { truncated, isSimple } = formatOutput({ success: true, data: rows }, "table");
  assert.equal(isSimple, true);
  assert.equal(truncated, true);
  const { truncated: csvTruncated } = formatOutput({ success: true, data: rows }, "csv");
  assert.equal(csvTruncated, false); // CSV never truncates
});
