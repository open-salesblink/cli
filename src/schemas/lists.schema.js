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

export const LeadUpdateBody = z
  .object({
    First_Name: z.string().optional(),
    Last_Name: z.string().optional(),
    Email: z.string().optional(),
    Phone: z.string().optional(),
    Company: z.string().optional(),
    Title: z.string().optional(),
  })
  .passthrough();

export const LeadMoveBody = z.object({ list_id: z.string() }).passthrough();

const ContactInputSchema = z
  .object({
    Email: z.string().optional(),
    email: z.string().optional(),
    First_Name: z.string().optional(),
    first_name: z.string().optional(),
    Last_Name: z.string().optional(),
    last_name: z.string().optional(),
    Phone: z.string().optional(),
    phone: z.string().optional(),
    Company_Name: z.string().optional(),
    company: z.string().optional(),
    Title: z.string().optional(),
    title: z.string().optional(),
  })
  .passthrough()
  .transform((c) => {
    const out = { ...c };
    if (out.email !== undefined && out.Email === undefined) out.Email = out.email;
    if (out.first_name !== undefined && out.First_Name === undefined) out.First_Name = out.first_name;
    if (out.last_name !== undefined && out.Last_Name === undefined) out.Last_Name = out.last_name;
    if (out.phone !== undefined && out.Phone === undefined) out.Phone = out.phone;
    if (out.company !== undefined && out.Company_Name === undefined) out.Company_Name = out.company;
    if (out.title !== undefined && out.Title === undefined) out.Title = out.title;
    delete out.email;
    delete out.first_name;
    delete out.last_name;
    delete out.phone;
    delete out.company;
    delete out.title;
    return out;
  })
  .refine((c) => typeof c.Email === "string" && c.Email.length > 0, {
    message: "Each contact must have an Email field",
    path: ["Email"],
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
    Email: z.string().optional(),
    First_Name: z.string().optional(),
    Last_Name: z.string().optional(),
    Phone: z.string().optional(),
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
  })
  .passthrough();

export const ListListResponse = Envelope(z.array(ListSchema));
export const ListGetResponse = Envelope(ListSchema).or(Envelope(z.array(ListSchema)));
export const LeadsListResponse = Envelope(z.object({ contacts: z.array(ContactSchema) }).passthrough()).or(Envelope(z.array(ContactSchema)));
export const LeadGetResponse = Envelope(ContactSchema);
export const ContactsMutateResponse = AnyEnvelope;
