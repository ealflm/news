import { z } from 'zod';

const usernameField = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .regex(/^[a-zA-Z0-9._-]+$/, 'username chỉ gồm a-z, 0-9, dấu . _ -');

export const CreateUserInputSchema = z.object({
  username: usernameField,
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(120),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const SetPasswordInputSchema = z.object({
  password: z.string().min(8).max(128),
});
export type SetPasswordInput = z.infer<typeof SetPasswordInputSchema>;

export interface UserListItem {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorUsername: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  meta: unknown;
  createdAt: string;
}
