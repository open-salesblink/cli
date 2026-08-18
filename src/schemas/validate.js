import { CliError, EXIT_ERROR } from "../client.js";

/** Parse data with a zod schema and throw a CliError on failure. */
export function validated(data, schema) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ");
    throw new CliError(`Response validation failed: ${issues}`, EXIT_ERROR);
  }
  return result.data;
}

/** Validate a request body (from flags or --from-json) before sending. */
export function validateBody(body, schema) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ");
    throw new CliError(`Invalid request body: ${issues}`, EXIT_ERROR);
  }
  return result.data;
}

import { z } from "zod";

/** Standard SalesBlink envelope with a typed `data`. passthrough keeps unknown fields. */
export const Envelope = (dataSchema) =>
  z
    .object({
      success: z.boolean().optional(),
      message: z.string().optional(),
      data: dataSchema.optional(),
    })
    .passthrough();

/** Loose envelope for endpoints whose response shape isn't documented. */
export const AnyEnvelope = z
  .object({
    success: z.boolean().optional(),
    message: z.string().optional(),
    data: z.unknown().optional(),
  })
  .passthrough();

export const OkResponseSchema = z
  .object({
    success: z.boolean().optional(),
    message: z.string().optional(),
  })
  .passthrough();
