import { z } from "zod";
import { AnyEnvelope } from "./validate.js";

export const InboxPlacementCreateBody = z
  .object({
    name: z.string().min(3),
    mode: z.enum(["one-time", "recurring"]),
    source: z.enum(["from-salesblink", "from-outside"]),
    content_type: z.enum(["custom", "sequence", "template"]).optional(),
    sender_id: z.string().optional(),
    email_senders: z.array(z.unknown()).optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    sequence_id: z.string().optional(),
    template_id: z.string().optional(),
    schedule_day: z.number().min(0).max(6).optional(),
    plainText: z.boolean().optional(),
  })
  .passthrough();

export const InboxPlacementListResponse = AnyEnvelope;
export const InboxPlacementMutateResponse = AnyEnvelope;
