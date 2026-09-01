import { z } from "zod";
import { Envelope, AnyEnvelope } from "./validate.js";

export const SenderUpdateBody = z
  .object({
    warmup_enabled: z.boolean().optional(),
    warmup_urls: z.array(z.unknown()).optional(),
    warmup_templates: z.array(z.unknown()).optional(),
    auto_ramp_up_enabled: z.boolean().optional(),
    ramp_up_frequency: z.number().optional(),
    max_daily_frequency: z.number().optional(),
    starting_warmup_frequency: z.number().optional(),
    open_rate: z.number().optional(),
    spam_protection: z.number().optional(),
    read_emulation: z.number().optional(),
    warmup_keyword: z.string().optional(),
    sequence_auto_ramp_up_enabled: z.boolean().optional(),
    sequence_initial_daily_frequency: z.number().optional(),
    sequence_ramp_up_frequency: z.number().optional(),
    sequence_max_daily_frequency: z.number().optional(),
    pause_cold_emails_when_health_low: z.boolean().optional(),
    pause_cold_emails_health_threshold: z.number().optional(),
    inbox_enabled: z.boolean().optional(),
    inbox_path: z.string().optional(),
    spam_path: z.string().optional(),
    signature: z.string().optional(),
    reply_to: z.string().optional(),
    dkim_identifier: z.string().optional(),
    use_custom_tracking_domain: z.boolean().optional(),
    tracking_domain: z.string().optional(),
    folder: z.string().optional(),
  })
  .passthrough();

export const SenderSchema = z
  .object({
    id: z.string().optional(),
    email: z.string().optional(),
    senderName: z.string().optional(),
    connected: z.boolean().optional(),
    connecting: z.boolean().optional(),
    has_error: z.boolean().optional(),
    warmup_active: z.boolean().optional(),
    warmup_paused: z.boolean().optional(),
    owned_by: z.string().optional(),
    folder: z.string().optional(),
    folderName: z.string().optional(),
  })
  .passthrough();

export const SendersListResponse = Envelope(z.array(SenderSchema).optional());
export const SenderMutateResponse = AnyEnvelope;
export const WarmupLinksResponse = AnyEnvelope;
export const SenderHealthResponse = AnyEnvelope;
export const SenderWarmupStatsResponse = AnyEnvelope;
export const SenderFetchMessagesResponse = AnyEnvelope;
export const SenderIdsBody = z.object({ ids: z.array(z.string()) }).passthrough();

