import { z } from "zod";
import { Envelope, AnyEnvelope } from "./validate.js";

const EmailStepSchema = z
  .object({
    type: z.literal("email"),
    template_id: z.string(),
  })
  .passthrough();

const DelayStepSchema = z
  .object({
    type: z.literal("delay"),
    days: z.number(),
  })
  .passthrough();

export const StepSchema = z.discriminatedUnion("type", [EmailStepSchema, DelayStepSchema]);

const EmailSendingHoursSchema = z
  .object({
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    fromTime: z.string().optional(),
    toTime: z.string().optional(),
  })
  .passthrough();

const sequenceShared = {
  name: z.string().optional(),
  folder: z.string().optional(),
  starred: z.boolean().optional(),
  senders: z.string().optional(),
  lists: z.array(z.string()).optional(),
  steps: z.array(StepSchema).optional(),
  launchTimingMode: z.enum(["now", "schedule"]).optional(),
  scheduledAt: z.union([z.string(), z.number()]).optional(),
  timezone: z.string().optional(),
  paused: z.boolean().optional(),
  delayEnabled: z.boolean().optional(),
  delayFrom: z.number().optional(),
  delayTo: z.number().optional(),
  stopWhenReplyRecieved: z.boolean().optional(),
  evergreen: z.boolean().optional(),
  bounceThreshold: z.number().optional(),
  bouncePause: z.boolean().optional(),
  autoPause: z.boolean().optional(),
  autoTagReplies: z.boolean().optional(),
  emailSendingHours: z.array(EmailSendingHoursSchema).optional(),
  sendToOnlyVerifiedEmail: z.boolean().optional(),
  validEmail: z.boolean().optional(),
  riskyEmail: z.boolean().optional(),
  invalidEmail: z.boolean().optional(),
  checkEmailOpen: z.boolean().optional(),
  checkEmailClick: z.boolean().optional(),
  checkEmailReply: z.boolean().optional(),
  checkEmailBeforeSending: z.boolean().optional(),
  plainText: z.boolean().optional(),
  auto_reply: z.boolean().optional(),
  matchProvider: z.boolean().optional(),
  skip_esg: z.boolean().optional(),
  stopWhenReplyRecievedWhen: z.enum(["contact", "contact-with-same-domain"]).optional(),
  bcc: z.string().optional(),
};

export const SequenceCreateBody = z
  .object({
    ...sequenceShared,
    name: z.string(),
    senders: z.string(),
    lists: z.array(z.string()),
    steps: z.array(StepSchema),
  })
  .passthrough();

export const SequenceUpdateBody = z.object(sequenceShared).passthrough();
export const ArchiveBody = z.object({ archived: z.boolean().optional() }).passthrough();

export const SequenceSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    paused: z.boolean().optional(),
    starred: z.boolean().optional(),
    archived: z.boolean().optional(),
    owned_by: z.string().optional(),
    sent: z.number().optional(),
    opens: z.number().optional(),
    clicks: z.number().optional(),
    replies: z.number().optional(),
  })
  .passthrough();

export const SequenceListResponse = Envelope(z.array(SequenceSchema));
export const SequenceGetResponse = Envelope(SequenceSchema);
export const SequenceStatsResponse = AnyEnvelope;
export const SequenceCloneResponse = AnyEnvelope;
export const SequenceExportResponse = AnyEnvelope;
export const SequenceStatusBody = z.object({ status: z.enum(["ACTIVE", "PAUSED", "STOPPED", "ARCHIVED"]) }).passthrough();

