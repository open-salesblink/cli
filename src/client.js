import { readConfig } from "./config.js";

const DEFAULT_BASE_URL = "https://run.salesblink.io/api/public/v1.0.0";
const VERSION = "0.1.0";

export const EXIT_OK = 0;
export const EXIT_ERROR = 1;
export const EXIT_AUTH = 2;
export const EXIT_NOT_FOUND = 3;
export const EXIT_RATE_LIMITED = 4;

export class CliError extends Error {
  constructor(message, exitCode = EXIT_ERROR) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export function maskApiKey(key) {
  if (key.length <= 4) return "****";
  return "****" + key.slice(-4);
}

function nonEmpty(v) {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

const DEFAULT_MAX_RETRIES = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class SalesBlinkClient {
  constructor(apiKey, baseUrl, retry) {
    const cfg = readConfig();
    const resolved = nonEmpty(apiKey) ?? nonEmpty(cfg.api_key);
    if (!resolved) {
      throw new CliError(
        "API key required. Pass --api-key or run: salesblink config set api_key <key>",
        EXIT_AUTH,
      );
    }
    this.apiKey = resolved;
    this.baseUrl = nonEmpty(baseUrl) ?? nonEmpty(cfg.base_url) ?? DEFAULT_BASE_URL;
    this.retryEnabled = retry ?? false;
    this.maxRetries = DEFAULT_MAX_RETRIES;
    this.userAgent = `salesblink-cli/${VERSION}`;
  }

  async request(opts) {
    const { method = "GET", path, params, body, file, files, rawText } = opts;
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    const headers = {
      // SalesBlink expects the raw key in the Authorization header (no "Bearer" prefix).
      Authorization: this.apiKey,
      "User-Agent": this.userAgent,
    };

    let requestBody;
    const fileList = files ?? (file ? [file] : undefined);
    if (fileList && fileList.length > 0) {
      const { readFileSync } = await import("node:fs");
      const { basename } = await import("node:path");
      const form = new FormData();
      for (const f of fileList) {
        const buf = readFileSync(f.path);
        form.append(f.field, new Blob([buf]), basename(f.path));
      }
      if (body && typeof body === "object") {
        for (const [k, v] of Object.entries(body)) {
          if (v !== undefined) form.set(k, typeof v === "string" ? v : JSON.stringify(v));
        }
      }
      requestBody = form; // fetch sets the multipart boundary — do not set Content-Type
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }

    let attempt = 0;
    const maxAttempts = this.retryEnabled ? this.maxRetries + 1 : 1;

    while (attempt < maxAttempts) {
      attempt++;

      let response;
      try {
        response = await fetch(url.toString(), { method, headers, body: requestBody });
      } catch (err) {
        throw new CliError(
          `fetch failed: ${err instanceof Error ? err.message : err}\nAttempted URL: ${url.toString()}\nMake sure the server is running and the base URL includes the API path (e.g. http://localhost:8080/api/public/v1.0.0).`,
          EXIT_ERROR,
        );
      }


      if (response.status === 401 || response.status === 403) {
        const text = await response.text().catch(() => "");
        throw new CliError(
          `Authentication failed (key ${maskApiKey(this.apiKey)}). Check your API key.${text ? " " + text : ""}`,
          EXIT_AUTH,
        );
      }

      if (response.status === 404) {
        const text = await response.text().catch(() => "");
        throw new CliError(`Not found: ${path}${text ? " — " + text : ""}`, EXIT_NOT_FOUND);
      }

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
        const retryAfterDisplay = retryAfterSeconds && !isNaN(retryAfterSeconds) ? retryAfterSeconds : "unknown";
        const text = await response.text().catch(() => "");

        if (this.retryEnabled && attempt < maxAttempts) {
          const baseDelay = retryAfterSeconds && !isNaN(retryAfterSeconds) ? retryAfterSeconds * 1000 : 1000;
          const delay = baseDelay * Math.pow(2, attempt - 1);
          process.stderr.write(
            `Rate limited. Retry after ${retryAfterDisplay}s. Retrying in ${Math.ceil(delay / 1000)}s (attempt ${attempt}/${maxAttempts})...\n`,
          );
          await sleep(delay);
          continue;
        }
        throw new CliError(
          `Rate limited. Retry after ${retryAfterDisplay}s.${text ? " " + text : ""}`,
          EXIT_RATE_LIMITED,
        );
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new CliError(`API error ${response.status}: ${text || response.statusText}`, EXIT_ERROR);
      }

      if (rawText) return await response.text();
      const text = await response.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        const contentType = response.headers.get("content-type") || "unknown";
        const preview = text.slice(0, 200).replace(/\s+/g, " ");
        throw new CliError(
          `API returned a non-JSON response (content-type: ${contentType}). The endpoint may be unavailable or returning an error page. Preview: ${preview}`,
          EXIT_ERROR,
        );
      }
    }

    throw new CliError("Max retries exceeded", EXIT_RATE_LIMITED);
  }
}
