import { Inject, Injectable } from '@nestjs/common';
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient } from '@news/db';

@Injectable()
export class AuditService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async record(args: {
    actorId: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    meta?: unknown;
    ip?: string | null;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: args.actorId,
          action: args.action,
          targetType: args.targetType,
          targetId: args.targetId ?? null,
          meta: (args.meta ?? null) as never,
          ip: args.ip ?? null,
        },
      });
    } catch {
      // Best-effort
    }
  }

  async list(opts: { limit: number; cursor?: string; actorId?: string; targetType?: string }) {
    const where: { actorId?: string; targetType?: string } = {};
    if (opts.actorId) where.actorId = opts.actorId;
    if (opts.targetType) where.targetType = opts.targetType;
    const items = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: { actor: { select: { email: true } } },
    });
    const nextCursor = items.length > opts.limit ? (items[opts.limit]?.id ?? null) : null;
    return { items: items.slice(0, opts.limit), nextCursor };
  }
}
