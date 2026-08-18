import { z } from "zod";
import { Envelope, AnyEnvelope } from "./validate.js";

export const UserCreateBody = z
  .object({
    email: z.string(),
    role: z.enum(["client", "user", "admin", "developer"]).optional(),
    url: z.string().optional(),
  })
  .passthrough();

export const UserUpdateBody = z
  .object({
    name: z.string().optional(),
    role: z.enum(["client", "user", "admin", "developer"]).optional(),
  })
  .passthrough();

export const UserSchema = z
  .object({
    id: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional(),
    role: z.string().optional(),
  })
  .passthrough();
export const UsersListResponse = Envelope(z.array(UserSchema));
export const UserGetResponse = Envelope(UserSchema);
export const UserMutateResponse = AnyEnvelope;

export const WorkspaceCreateBody = z.object({ name: z.string() }).passthrough();
export const WorkspaceUpdateBody = z.object({ name: z.string() }).passthrough();
export const WorkspaceSchema = z.object({ id: z.string().optional(), name: z.string().optional() }).passthrough();
export const WorkspacesListResponse = Envelope(z.array(WorkspaceSchema));
export const WorkspaceMutateResponse = AnyEnvelope;

export const KeyCreateBody = z.object({ name: z.string() }).passthrough();
export const KeySchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    key: z.string().optional(),
    created_at: z.string().optional(),
  })
  .passthrough();
export const KeysListResponse = Envelope(z.array(KeySchema));
export const KeyMutateResponse = AnyEnvelope;
