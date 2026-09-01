import { z } from "zod";
import { Envelope, AnyEnvelope } from "./validate.js";

// ── Request bodies ──────────────────────────────────────────────────────────
export const ListCreateBody = z
  .object({
    name: z.string(),
    folder: z.string().optional(),
    starred: z.boolean().optional(),
    verification: z.boolean().optional(),
    archive_invalid: z.boolean().optional(),
    archive_risky: z.boolean().optional(),
    removeDuplicates: z.object({}).passthrough().optional(),
  })
  .passthrough();

export const ListUpdateBody = z
  .object({
    name: z.string().optional(),
    folder: z.string().optional(),
    starred: z.boolean().optional(),
    duplicate_removal: z.boolean().optional(),
    duplicate_removal_other_list: z.boolean().optional(),
    duplicate_removal_team_list: z.boolean().optional(),
    verification: z.boolean().optional(),
    archive_invalid: z.boolean().optional(),
    archive_risky: z.boolean().optional(),
  })
  .passthrough();

export const ArchiveBody = z.object({ archived: z.boolean().optional() }).passthrough();

const SNAKE_CASE_REGEX = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

const snakeCaseOnly = (schema) =>
  schema.superRefine((obj, ctx) => {
    for (const key of Object.keys(obj)) {
      if (!SNAKE_CASE_REGEX.test(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid field "${key}": all field names must be snake_case (e.g. first_name, company_name, lead_score)`,
          path: [key],
        });
      }
    }
  });

export const LeadUpdateBody = snakeCaseOnly(
  z
    .object({
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      company_name: z.string().optional(),
      job_title: z.string().optional(),
      starred: z.boolean().optional(),
    })
    .passthrough()
);

export const LeadMoveBody = z.object({ list_id: z.string() }).passthrough();

const ContactInputSchema = snakeCaseOnly(
  z
    .object({
      email: z.string().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      phone: z.string().optional(),
      company_name: z.string().optional(),
      job_title: z.string().optional(),
      starred: z.boolean().optional(),
    })
    .passthrough()
).refine((c) => typeof c.email === "string" && c.email.length > 0, {
  message: "Each contact must have an email field",
  path: ["email"],
});

export const ContactsAddBody = z
  .object({
    list_id: z.string(),
    contacts: z.array(ContactInputSchema),
    remove_duplicates: z.boolean().optional(),
  })
  .passthrough();

export const ContactsRemoveBody = z.object({ list_id: z.string(), email: z.string() }).passthrough();

// ── Responses ───────────────────────────────────────────────────────────────
export const ContactSchema = z
  .object({
    id: z.string().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
    list_id: z.string().optional(),
    owned_by: z.string().optional(),
    archived: z.boolean().optional(),
    accuracy: z.string().optional(),
  })
  .passthrough();

export const ListSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    contacts_count: z.number().optional(),
    starred: z.boolean().optional(),
    archived: z.boolean().optional(),
    owned_by: z.string().optional(),
    last_modified: z.string().optional(),
    fields: z.array(z.string()).optional(),
  })
  .passthrough();

export const ListListResponse = Envelope(z.array(ListSchema));
export const ListGetResponse = Envelope(ListSchema).or(Envelope(z.array(ListSchema)));
export const LeadsListResponse = Envelope(z.object({ contacts: z.array(ContactSchema) }).passthrough()).or(Envelope(z.array(ContactSchema)));
export const LeadGetResponse = Envelope(ContactSchema);
export const ContactsMutateResponse = AnyEnvelope;
