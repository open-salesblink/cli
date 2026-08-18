import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
// Redirect HOME to an empty temp dir BEFORE importing the client, so the
// config fallback (~/.salesblink/config.json) never picks up a real API key
// from the developer's machine. config.js resolves homedir() at module load.
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const fakeHome = mkdtempSync(join(tmpdir(), "sb-cli-test-home-"));
process.env.HOME = fakeHome;
process.env.USERPROFILE = fakeHome; // Windows

const { SalesBlinkClient, CliError, EXIT_AUTH, EXIT_NOT_FOUND, EXIT_RATE_LIMITED } = await import("../src/client.js");

const API_KEY = "sb-testkey-1234567890abcdef";

let server;
let baseUrl;
let lastRequest;
let routeHandler = () => ({ status: 200, body: { success: true, data: [] } });

before(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      lastRequest = { method: req.method, url: req.url, headers: req.headers, body };
      const { status, headers = {}, body: resBody } = routeHandler(req);
      res.writeHead(status, { "content-type": "application/json", ...headers });
      res.end(typeof resBody === "string" ? resBody : JSON.stringify(resBody));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test("sends the raw API key in the Authorization header (no Bearer prefix)", async () => {
  const client = new SalesBlinkClient(API_KEY, baseUrl);
  await client.request({ path: "/lists" });
  assert.equal(lastRequest.headers["authorization"], API_KEY);
  assert.match(lastRequest.headers["user-agent"], /^salesblink-cli\//);
});

test("appends query params and skips undefined values", async () => {
  const client = new SalesBlinkClient(API_KEY, baseUrl);
  await client.request({ path: "/lists", params: { limit: 10, search: undefined, skip: 0 } });
  const url = new URL(lastRequest.url, baseUrl);
  assert.equal(url.searchParams.get("limit"), "10");
  assert.equal(url.searchParams.get("skip"), "0");
  assert.equal(url.searchParams.has("search"), false);
});

test("sends JSON bodies with the right content type", async () => {
  const client = new SalesBlinkClient(API_KEY, baseUrl);
  await client.request({ method: "POST", path: "/lists", body: { name: "Test" } });
  assert.match(lastRequest.headers["content-type"], /application\/json/);
  assert.deepEqual(JSON.parse(lastRequest.body), { name: "Test" });
});

test("401 throws EXIT_AUTH and masks the API key", async () => {
  routeHandler = () => ({ status: 401, body: { message: "unauthorized" } });
  const client = new SalesBlinkClient(API_KEY, baseUrl);
  await assert.rejects(() => client.request({ path: "/lists" }), (err) => {
    assert.equal(err.exitCode, EXIT_AUTH);
    assert.ok(!err.message.includes(API_KEY), "full key must not leak into the error");
    assert.match(err.message, /\*\*\*\*cdef/); // only last 4 chars shown
    return true;
  });
  routeHandler = () => ({ status: 200, body: { success: true } });
});

test("404 throws EXIT_NOT_FOUND", async () => {
  routeHandler = () => ({ status: 404, body: { message: "nope" } });
  const client = new SalesBlinkClient(API_KEY, baseUrl);
  await assert.rejects(() => client.request({ path: "/lists/x" }), (err) => err.exitCode === EXIT_NOT_FOUND);
  routeHandler = () => ({ status: 200, body: { success: true } });
});

test("429 without --retry throws EXIT_RATE_LIMITED", async () => {
  routeHandler = () => ({ status: 429, headers: { "retry-after": "30" }, body: {} });
  const client = new SalesBlinkClient(API_KEY, baseUrl, false);
  await assert.rejects(() => client.request({ path: "/lists" }), (err) => err.exitCode === EXIT_RATE_LIMITED);
  routeHandler = () => ({ status: 200, body: { success: true } });
});

test("429 with --retry retries and eventually succeeds", async () => {
  let calls = 0;
  routeHandler = () => {
    calls++;
    return calls === 1
      ? { status: 429, headers: { "retry-after": "0" }, body: {} }
      : { status: 200, body: { success: true, data: [{ id: "1" }] } };
  };
  const client = new SalesBlinkClient(API_KEY, baseUrl, true);
  const result = await client.request({ path: "/lists" });
  assert.equal(calls, 2);
  assert.deepEqual(result.data, [{ id: "1" }]);
  routeHandler = () => ({ status: 200, body: { success: true } });
});

test("missing API key throws EXIT_AUTH before any request", () => {
  assert.throws(() => new SalesBlinkClient("", baseUrl), (err) => err instanceof CliError && err.exitCode === EXIT_AUTH);
});

test("non-JSON responses raise a descriptive error", async () => {
  routeHandler = () => ({ status: 200, headers: { "content-type": "text/html" }, body: "<html>oops</html>" });
  const client = new SalesBlinkClient(API_KEY, baseUrl);
  await assert.rejects(() => client.request({ path: "/lists" }), /non-JSON response/);
  routeHandler = () => ({ status: 200, body: { success: true } });
});
