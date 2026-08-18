import { z } from "zod";
import { Envelope, AnyEnvelope } from "./validate.js";

export const TemplateCreateBody = z
  .object({
    name: z.string(),
    subject_line: z.string(),
    content: z.string(),
    folder: z.string().optional(),
    starred: z.boolean().optional(),
    attachments: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const TemplateUpdateBody = z
  .object({
    name: z.string().optional(),
    subject_line: z.string().optional(),
    content: z.string().optional(),
    starred: z.boolean().optional(),
    attachments: z.array(z.unknown()).optional(),
    remove_attachments: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const ArchiveBody = z.object({ archived: z.boolean().optional() }).passthrough();

export const TemplateSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    subject_line: z.string().optional(),
    starred: z.boolean().optional(),
    archived: z.boolean().optional(),
    owned_by: z.string().optional(),
  })
  .passthrough();

export const TemplateListResponse = Envelope(z.array(TemplateSchema));
export const TemplateGetResponse = Envelope(TemplateSchema);
export const TemplateMutateResponse = AnyEnvelope;
