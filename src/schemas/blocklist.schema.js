import { z } from "zod";
import { AnyEnvelope } from "./validate.js";

export const BlocklistAddBody = z
  .object({
    emails: z.union([z.array(z.string()), z.string()]).optional(),
    email: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();

export const BlocklistRemoveBody = z
  .object({
    emails: z.union([z.array(z.string()), z.string()]).optional(),
    email: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();

export const BlocklistListResponse = AnyEnvelope;
export const BlocklistCheckResponse = AnyEnvelope;
export const BlocklistMutateResponse = AnyEnvelope;
