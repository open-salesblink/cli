import { test } from "node:test";
import assert from "node:assert/strict";
import { validated, validateBody, Envelope, OkResponseSchema } from "../src/schemas/validate.js";
import { ListCreateBody, ContactsAddBody } from "../src/schemas/lists.schema.js";
import { SequenceStatusBody } from "../src/schemas/sequences.schema.js";
import { CliError } from "../src/client.js";
import { z } from "zod";

test("validateBody rejects missing required fields before any network call", () => {
  assert.throws(() => validateBody({}, ListCreateBody), (err) =>
    err instanceof CliError && /Invalid request body/.test(err.message) && /name/.test(err.message));
});

test("validateBody rejects invalid enum values", () => {
  assert.throws(() => validateBody({ status: "BOGUS" }, SequenceStatusBody), (err) =>
    err instanceof CliError && /Invalid enum value/.test(err.message));
  assert.deepEqual(validateBody({ status: "ACTIVE" }, SequenceStatusBody), { status: "ACTIVE" });
});

test("validated rejects malformed API responses", () => {
  const schema = Envelope(z.array(z.object({ id: z.string() })));
  assert.throws(() => validated({ success: true, data: [{ id: 123 }] }, schema), (err) =>
    err instanceof CliError && /Response validation failed/.test(err.message));
});

test("envelope passes through unknown fields (never silently drops them)", () => {
  const parsed = validated(
    { success: true, data: [], brand_new_field: { nested: true } },
    Envelope(z.array(z.unknown())),
  );
  assert.deepEqual(parsed.brand_new_field, { nested: true });
});

test("OkResponseSchema tolerates any extra fields", () => {
  const parsed = validated({ success: true, message: "done", extra: [1, 2] }, OkResponseSchema);
  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.extra, [1, 2]);
});

test("ContactsAddBody normalizes snake_case contact fields to API casing", () => {
  const body = validateBody(
    { list_id: "l1", contacts: [{ email: "a@b.co", first_name: "Ada", company: "Acme" }] },
    ContactsAddBody,
  );
  const contact = body.contacts[0];
  assert.equal(contact.Email, "a@b.co");
  assert.equal(contact.First_Name, "Ada");
  assert.equal(contact.Company_Name, "Acme");
  assert.equal(contact.email, undefined);
  assert.equal(contact.first_name, undefined);
});

test("ContactsAddBody requires an Email on every contact", () => {
  assert.throws(
    () => validateBody({ list_id: "l1", contacts: [{ first_name: "NoEmail" }] }, ContactsAddBody),
    /Each contact must have an Email field/,
  );
});
