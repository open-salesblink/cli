import { z } from "zod";
import { AnyEnvelope } from "./validate.js";

export const OAuthInitBody = z.object({}).passthrough();

export const OpaqueResponse = AnyEnvelope;

export const AccountVerifyResponse = AnyEnvelope;
