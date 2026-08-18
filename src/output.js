import Table from "cli-table3";

const TABLE_PRIORITY = [
  "id", "name", "title", "subject", "subject_line", "email",
  "senderName", "serviceName", "microsoft_email", "senderType",
  "contacts_count", "sent", "opens", "clicks", "replies",
  "sendingEnabled", "receivingEnabled", "warmupEnabled", "inboxEnabled",
  "paused", "archived", "status", "owned_by", "last_modified",
  "created_at", "date_created", "created_date", "last_updated",
];

const MAX_SIMPLE_TABLE_ROWS = 10;

/** Detect the best default output format: JSON when piped, table when interactive. */
export function detectFormat() {
  return process.stdout.isTTY ? "table" : "json";
}

// Unwrap the standard SalesBlink envelope { success, data, message } for tabular output.
function unwrap(data) {
  if (data && typeof data === "object" && !Array.isArray(data) && "data" in data && "success" in data) {
    return data.data;
  }
  return data;
}

function isScalar(v) {
  return v === null || v === undefined || typeof v !== "object";
}

function isSimplePayload(data) {
  const payload = unwrap(data);
  const rows = Array.isArray(payload) ? payload : [payload];
  if (rows.length === 0 || !rows[0] || typeof rows[0] !== "object") {
    return { isSimple: false, rows, keys: [] };
  }

  const keySet = new Set();
  for (const row of rows) {
    if (row && typeof row === "object") {
      for (const k of Object.keys(row)) keySet.add(k);
    }
  }
  const keys = [...keySet];

  const allScalar = rows.every((row) => keys.every((k) => isScalar(row?.[k])));
  const isSimple = allScalar && keys.length > 0 && keys.length <= 4;

  return { isSimple, rows, keys };
}

export function formatOutput(data, format, columns) {
  if (format === "json") {
    return { output: JSON.stringify(data, null, 2), isSimple: false, truncated: false };
  }

  const { isSimple, rows, keys } = isSimplePayload(data);
  if (rows.length === 0) {
    return { output: "", isSimple: false, truncated: false };
  }

  const maxRows = format === "table" ? MAX_SIMPLE_TABLE_ROWS : Infinity;
  const truncated = isSimple && rows.length > maxRows;
  const displayRows = truncated ? rows.slice(0, maxRows) : rows;
  const flat = displayRows.map((r) => flatten(r));

  let selectedKeys = keys;
  if (!isSimple) {
    const allKeys = Object.keys(flat[0] ?? {});
    if (columns && columns.length > 0) {
      selectedKeys = columns.filter((k) => k in flat[0]);
    } else {
      selectedKeys = selectTableColumns(allKeys);
    }
  }

  if (format === "csv") return { output: formatCsv(flat, selectedKeys), isSimple, truncated };
  return { output: formatTable(flat, selectedKeys), isSimple, truncated };
}

function selectTableColumns(allKeys) {
  const terminalWidth = process.stdout.columns || 120;
  const borderWidth = 3;
  const minColWidth = 12;
  const maxCols = Math.max(3, Math.floor((terminalWidth - borderWidth) / minColWidth));

  const priority = TABLE_PRIORITY.filter((k) => allKeys.includes(k));
  const selected = priority.slice(0, maxCols);
  return selected.length > 0 ? selected : allKeys.slice(0, maxCols);
}

function flatten(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === null || v === undefined) out[k] = "";
    else if (Array.isArray(v) || (typeof v === "object" && v !== null)) out[k] = JSON.stringify(v);
    else out[k] = v;
  }
  return out;
}

function formatCsv(rows, keys) {
  const escape = (val) => {
    const s = val === null || val === undefined ? "" : String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [keys.join(",")];
  for (const row of rows) lines.push(keys.map((k) => escape(row[k])).join(","));
  return lines.join("\n");
}

function formatTable(rows, keys) {
  const terminalWidth = process.stdout.columns || 120;
  const borderWidth = 3; // chars per column border/padding in cli-table3
  const minColWidth = 8;
  const maxColWidth = Math.max(minColWidth, Math.floor((terminalWidth - borderWidth) / Math.max(1, keys.length)) - borderWidth);
  const colWidths = keys.map(() => maxColWidth);

  const table = new Table({ head: keys, colWidths, wordWrap: true, truncate: "..." });
  for (const row of rows) {
    table.push(keys.map((k) => {
      const v = row[k];
      return v === null || v === undefined ? "" : String(v);
    }));
  }
  return table.toString();
}

export function printData(data, format, columns) {
  const { output, isSimple, truncated } = formatOutput(data, format, columns);
  const payload = unwrap(data);
  const totalRows = Array.isArray(payload) ? payload.length : (payload ? 1 : 0);

  process.stdout.write(output + "\n", () => {
    if (format !== "table") return;

    if (isSimple && truncated) {
      process.stderr.write(`\nShowing first ${MAX_SIMPLE_TABLE_ROWS} of ${totalRows} rows. Add --format json to see the full response.\n`);
    }

    process.stderr.write("\n");
    process.stderr.write("===========================================================\n");
    process.stderr.write("  NOTE: THE TABLE ABOVE MAY NOT SHOW ALL DATA FROM THE RESPONSE\n");
    process.stderr.write("  TO VIEW THE COMPLETE RESPONSE, ADD --format json AT THE END OF YOUR COMMAND\n");
    process.stderr.write("  EXAMPLE: " + buildJsonTip() + "\n");
    process.stderr.write("===========================================================\n");
    process.stderr.write("\n");
  });
}

function buildJsonTip() {
  const executable = "salesblink";
  const args = process.argv.slice(1);
  const newArgs = [];
  let replaced = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--format" || arg === "-f") {
      newArgs.push(arg, "json");
      i++;
      replaced = true;
    } else if (arg.startsWith("--format=")) {
      newArgs.push("--format=json");
      replaced = true;
    } else if (arg.startsWith("-f=")) {
      newArgs.push("-f=json");
      replaced = true;
    } else if (arg === process.argv[1]) {
      // skip the script path when running from source; user runs "salesblink" instead
      continue;
    } else {
      newArgs.push(arg);
    }
  }

  if (!replaced) {
    newArgs.push("--format", "json");
  }

  return [executable, ...newArgs].join(" ");
}

export function printError(message) {
  process.stderr.write(`Error: ${message}\n`);
}
