// Shared helpers used across command files.
import { readFileSync } from "node:fs";
import { SalesBlinkClient, CliError, EXIT_ERROR } from "../client.js";
import { detectFormat } from "../output.js";

/** Parse a comma-separated string into an array of trimmed, non-empty values. */
export function csvArr(v) {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return v;
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function resolveFormat(program) {
  const f = program.opts()["format"];
  if (f === "json" || f === "table" || f === "csv") return f;
  return detectFormat();
}

export function makeClient(program) {
  const opts = program.opts();
  return new SalesBlinkClient(opts["apiKey"], opts["baseUrl"], opts["retry"]);
}

export function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (err) {
    throw new CliError(
      `Failed to read JSON from ${path}: ${err instanceof Error ? err.message : err}`,
      EXIT_ERROR,
    );
  }
}

/** Collect only defined option values into a body object. */
export function pick(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Parse a boolean-ish string option (for query params). */
/** Convert an ISO 8601 date string to a Unix timestamp in milliseconds. */
export function toTimestamp(v) {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) throw new CliError(`Invalid date: ${v}`, EXIT_ERROR);
  return d.getTime();
}

export function boolOpt(v) {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return undefined;
}

export function requireConfirm(confirm, action) {
  if (!confirm) throw new CliError(`Pass --confirm to ${action}`, EXIT_ERROR);
}
