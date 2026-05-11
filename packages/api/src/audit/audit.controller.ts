import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursor?: string,
    @Query('actorId') actorId?: string,
    @Query('targetType') targetType?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitRaw ?? '50', 10) || 50, 1), 200);
    const result = await this.audit.list({
      limit,
      ...(cursor ? { cursor } : {}),
      ...(actorId ? { actorId } : {}),
      ...(targetType ? { targetType } : {}),
    });
    return {
      items: result.items.map((i) => ({
        id: i.id,
        actorEmail: i.actor?.email ?? null,
        action: i.action,
        targetType: i.targetType,
        targetId: i.targetId,
        meta: i.meta,
        createdAt: i.createdAt.toISOString(),
      })),
      nextCursor: result.nextCursor,
    };
  }
}
