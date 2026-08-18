import { z } from "zod";
import { AnyEnvelope } from "./validate.js";

export const OAuthInitBody = z.object({}).passthrough();
export const SignupBody = z.object({ email: z.string(), password: z.string(), name: z.string() }).passthrough();

export const DfyMailbox = z
  .object({
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  })
  .passthrough();

export const DfyDomain = z
  .object({
    domain: z.string(),
    mailboxes: z.array(DfyMailbox).optional(),
  })
  .passthrough();

export const DfyOrderBody = z
  .object({
    domains: z.array(DfyDomain),
    type: z.enum(["google", "outlook", "azure"]),
    redirectionUrl: z.string().optional(),
    masterInboxEmail: z.string().optional(),
    password: z.string().optional(),
    couponCode: z.string().optional(),
  })
  .passthrough();

export const DfyMailboxBody = z
  .object({
    domainName: z.string(),
    emails: z.array(z.object({
      username: z.string().min(1),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
    })),
    password: z.string().optional(),
  })
  .passthrough();

export const OpaqueResponse = AnyEnvelope;

export const AccountVerifyResponse = AnyEnvelope;

