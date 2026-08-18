import { z } from "zod";
import { AnyEnvelope } from "./validate.js";
export const ActivityResponse = AnyEnvelope.or(z.array(z.unknown()));
export const ReportsResponse = AnyEnvelope;
