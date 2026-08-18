import { z } from "zod";
import { Envelope, AnyEnvelope } from "./validate.js";

export const InboxUpdateBody = z
  .object({ unread: z.boolean().optional(), outcome: z.string().optional() })
  .passthrough();

export const InboxReplyBody = z
  .object({ content: z.string(), cc: z.string().optional(), bcc: z.string().optional() })
  .passthrough();


export const InboxForwardBody = z
  .object({
    messageID: z.string().optional(),
    email: z.string().optional(),
    content: z.string().optional(),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    scheduled_time: z.union([z.string(), z.number()]).optional(),
    tzMode: z.string().optional(),
    selectedTimezone: z.string().optional(),
  })
  .passthrough();


export const ThreadSchema = z
  .object({
    id: z.string().optional(),
    messageId: z.string().optional(),
    task_type: z.string().optional(),
    email: z.string().optional(),
  })
  .passthrough();

export const InboxListResponse = Envelope(
  z.object({ totalCount: z.number().optional(), result: z.array(ThreadSchema).optional() }).passthrough(),
);
export const InboxThreadResponse = AnyEnvelope;
export const InboxMutateResponse = AnyEnvelope;
