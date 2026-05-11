import { z } from 'zod';

export const InviteUserInputSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(120).optional(),
});
export type InviteUserInput = z.infer<typeof InviteUserInputSchema>;

export const AcceptInviteInputSchema = z.object({
  token: z.string().min(20),
  displayName: z.string().min(1).max(120),
  password: z.string().min(8).max(128),
});
export type AcceptInviteInput = z.infer<typeof AcceptInviteInputSchema>;

export interface UserListItem {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  invitedByEmail: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  meta: unknown;
  createdAt: string;
}
