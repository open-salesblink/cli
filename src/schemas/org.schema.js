import { z } from "zod";
import { Envelope, AnyEnvelope } from "./validate.js";

export const FolderCreateBody = z
  .object({
    name: z.string(),
    type: z.enum(["email-sender"]).optional(),
  })
  .passthrough();

export const FolderSchema = z
  .object({ id: z.string().optional(), name: z.string().optional(), type: z.string().optional() })
  .passthrough();

export const FoldersListResponse = Envelope(z.array(FolderSchema));
export const FolderCreateResponse = AnyEnvelope;

export const DomainInstructionsSchema = z
  .object({
    record_type: z.string().optional(),
    host: z.string().optional(),
    value: z.string().optional(),
    message: z.string().optional(),
  })
  .nullable()
  .optional();

export const DomainSchema = z
  .object({
    id: z.string().optional(),
    _id: z.string().optional(),
    domain: z.string().optional(),
    type: z.string().optional(),
    verified: z.boolean().optional(),
    status: z.string().optional(),
    tag: z.string().optional(),
    instructions: DomainInstructionsSchema,
    uid: z.string().optional(),
    owned_by: z.string().optional(),
  })
  .passthrough();
export const DomainsListResponse = Envelope(z.array(DomainSchema));
export const DomainsSearchResponse = AnyEnvelope;

export const SignaturesListResponse = AnyEnvelope;
