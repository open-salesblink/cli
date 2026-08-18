import { z } from "zod";
import { Envelope, AnyEnvelope } from "./validate.js";

export const FolderCreateBody = z
  .object({ name: z.string(), type: z.enum(["email-sender"]) })
  .passthrough();

export const FolderSchema = z
  .object({ id: z.string().optional(), name: z.string().optional(), type: z.string().optional() })
  .passthrough();

export const FoldersListResponse = Envelope(z.array(FolderSchema));
export const FolderCreateResponse = AnyEnvelope;

export const DomainSchema = z
  .object({ id: z.string().optional(), domain: z.string().optional(), verified: z.boolean().optional() })
  .passthrough();
export const DomainsListResponse = Envelope(z.array(DomainSchema));
export const DomainsSearchResponse = AnyEnvelope;

export const SignaturesListResponse = AnyEnvelope;
