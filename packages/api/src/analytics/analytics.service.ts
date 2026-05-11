import { Inject, Injectable } from '@nestjs/common';
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient } from '@news/db';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async recordView(args: {
    postId: string;
    sessionId?: string | null;
    ipHash?: string | null;
    device?: string | null;
    inFbApp?: boolean;
    referrer?: string | null;
  }): Promise<void> {
    // Avoid blocking; fire-and-forget at caller level
    await this.prisma.viewEvent.create({
      data: {
        postId: args.postId,
        sessionId: args.sessionId ?? null,
        ipHash: args.ipHash ?? null,
        device: args.device ?? null,
        inFbApp: args.inFbApp ?? false,
        referrer: args.referrer ?? null,
      },
    });
    // Increment Post.viewCount denormalized cache
    await this.prisma.post
      .update({
        where: { id: args.postId },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  /** Daily rollup — aggregate yesterday's events into PostStatDaily + PopupStatDaily. */
  async runDailyRollup(targetDay?: Date): Promise<{ posts: number; popups: number }> {
    const day = targetDay ?? new Date(Date.now() - 24 * 3600 * 1000);
    const startOfDay = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 3600 * 1000);

    // Aggregate views per post
    const postAgg = await this.prisma.viewEvent.groupBy({
      by: ['postId'],
      where: { createdAt: { gte: startOfDay, lt: endOfDay } },
      _count: { _all: true },
    });

    // Aggregate clicks per post
    const clicksByPost = await this.prisma.clickEvent.groupBy({
      by: ['postId'],
      where: { createdAt: { gte: startOfDay, lt: endOfDay }, postId: { not: null } },
      _count: { _all: true },
    });
    const clicksByPostMap = new Map(
      clicksByPost.filter((c) => c.postId).map((c) => [c.postId!, c._count._all]),
    );

    let postsRollup = 0;
    for (const row of postAgg) {
      await this.prisma.postStatDaily.upsert({
        where: { postId_day: { postId: row.postId, day: startOfDay } },
        update: { views: row._count._all, clicks: clicksByPostMap.get(row.postId) ?? 0 },
        create: {
          postId: row.postId,
          day: startOfDay,
          views: row._count._all,
          clicks: clicksByPostMap.get(row.postId) ?? 0,
        },
      });
      postsRollup += 1;
    }

    // Aggregate clicks per popup
    const clicksByPopup = await this.prisma.clickEvent.groupBy({
      by: ['popupId'],
      where: { createdAt: { gte: startOfDay, lt: endOfDay } },
      _count: { _all: true },
    });
    let popupsRollup = 0;
    for (const row of clicksByPopup) {
      await this.prisma.popupStatDaily.upsert({
        where: { popupId_day: { popupId: row.popupId, day: startOfDay } },
        update: { clicks: row._count._all },
        create: { popupId: row.popupId, day: startOfDay, clicks: row._count._all, shown: 0 },
      });
      popupsRollup += 1;
    }

    return { posts: postsRollup, popups: popupsRollup };
  }

  /** Dashboard overview: last N days, combining today's raw + rollups for older days. */
  async getOverview(daysWindow = 7): Promise<{
    kpis: {
      range: string;
      posts: { total: number; published: number };
      views: { total: number; deltaPercent: number };
      clicks: { total: number; deltaPercent: number };
      ctr: { value: number; deltaPercent: number };
    };
    series: { day: string; views: number; clicks: number }[];
    topPosts: {
      postId: string;
      title: string;
      slug: string | null;
      views: number;
      clicks: number;
    }[];
    topPopups: { popupId: string; name: string; clicks: number; ctr: number }[];
  }> {
    const now = new Date();
    const startCurrent = new Date(now.getTime() - daysWindow * 24 * 3600 * 1000);
    const startPrev = new Date(now.getTime() - daysWindow * 2 * 24 * 3600 * 1000);

    // KPI: post counts (all-time)
    const totalPosts = await this.prisma.post.count();
    const publishedPosts = await this.prisma.post.count({ where: { status: 'PUBLISHED' } });

    // Current window views/clicks (raw from event tables for simplicity; correct enough for small data)
    const currentViews = await this.prisma.viewEvent.count({
      where: { createdAt: { gte: startCurrent } },
    });
    const prevViews = await this.prisma.viewEvent.count({
      where: { createdAt: { gte: startPrev, lt: startCurrent } },
    });
    const currentClicks = await this.prisma.clickEvent.count({
      where: { createdAt: { gte: startCurrent } },
    });
    const prevClicks = await this.prisma.clickEvent.count({
      where: { createdAt: { gte: startPrev, lt: startCurrent } },
    });

    const ctrCurrent = currentViews > 0 ? currentClicks / currentViews : 0;
    const ctrPrev = prevViews > 0 ? prevClicks / prevViews : 0;

    function pctDelta(curr: number, prev: number): number {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    }

    // Series: per-day counts via SQL date_trunc grouping
    const seriesRaw = await this.prisma.$queryRaw<{ day: Date; views: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS views
      FROM "ViewEvent"
      WHERE "createdAt" >= ${startCurrent}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `;
    const clicksRaw = await this.prisma.$queryRaw<{ day: Date; clicks: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS clicks
      FROM "ClickEvent"
      WHERE "createdAt" >= ${startCurrent}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `;
    const clickMap = new Map(
      clicksRaw.map((r) => [r.day.toISOString().slice(0, 10), Number(r.clicks)]),
    );

    // Fill missing days with zero
    const series: { day: string; views: number; clicks: number }[] = [];
    for (let i = daysWindow - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      const viewRow = seriesRaw.find((r) => r.day.toISOString().slice(0, 10) === key);
      series.push({
        day: key,
        views: viewRow ? Number(viewRow.views) : 0,
        clicks: clickMap.get(key) ?? 0,
      });
    }

    // Top posts (window) by views
    const topPostsAgg = await this.prisma.viewEvent.groupBy({
      by: ['postId'],
      where: { createdAt: { gte: startCurrent } },
      _count: { _all: true },
      orderBy: { _count: { postId: 'desc' } },
      take: 10,
    });
    const topPosts: {
      postId: string;
      title: string;
      slug: string | null;
      views: number;
      clicks: number;
    }[] = [];
    for (const r of topPostsAgg) {
      const post = await this.prisma.post.findUnique({
        where: { id: r.postId },
        select: { id: true, title: true, slug: true },
      });
      if (!post) continue;
      const clicks = await this.prisma.clickEvent.count({
        where: { postId: r.postId, createdAt: { gte: startCurrent } },
      });
      topPosts.push({
        postId: post.id,
        title: post.title,
        slug: post.slug,
        views: r._count._all,
        clicks,
      });
    }

    // Top popups by CTR (clicks/views over the same window)
    const popupClickAgg = await this.prisma.clickEvent.groupBy({
      by: ['popupId'],
      where: { createdAt: { gte: startCurrent } },
      _count: { _all: true },
      orderBy: { _count: { popupId: 'desc' } },
      take: 10,
    });
    const topPopups: { popupId: string; name: string; clicks: number; ctr: number }[] = [];
    for (const r of popupClickAgg) {
      const popup = await this.prisma.popup.findUnique({
        where: { id: r.popupId },
        select: { id: true, name: true },
      });
      if (!popup) continue;
      // Approx CTR: clicks divided by current views; we don't track "shown" yet
      const ctr = currentViews > 0 ? r._count._all / currentViews : 0;
      topPopups.push({ popupId: popup.id, name: popup.name, clicks: r._count._all, ctr });
    }

    return {
      kpis: {
        range: `${daysWindow}d`,
        posts: { total: totalPosts, published: publishedPosts },
        views: { total: currentViews, deltaPercent: pctDelta(currentViews, prevViews) },
        clicks: { total: currentClicks, deltaPercent: pctDelta(currentClicks, prevClicks) },
        ctr: {
          value: Math.round(ctrCurrent * 10000) / 100,
          deltaPercent: pctDelta(ctrCurrent, ctrPrev),
        },
      },
      series,
      topPosts,
      topPopups,
    };
  }

  /** Export per-post stats as CSV string. */
  async exportPostsCsv(daysWindow = 30): Promise<string> {
    const startCurrent = new Date(Date.now() - daysWindow * 24 * 3600 * 1000);
    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, slug: true, title: true, publishedAt: true, viewCount: true },
      orderBy: { publishedAt: 'desc' },
    });
    const rows: string[] = [
      'post_id,slug,title,published_at,total_views,window_views,window_clicks',
    ];
    for (const p of posts) {
      const wv = await this.prisma.viewEvent.count({
        where: { postId: p.id, createdAt: { gte: startCurrent } },
      });
      const wc = await this.prisma.clickEvent.count({
        where: { postId: p.id, createdAt: { gte: startCurrent } },
      });
      const title = `"${p.title.replace(/"/g, '""')}"`;
      rows.push(
        `${p.id},${p.slug},${title},${p.publishedAt?.toISOString() ?? ''},${p.viewCount},${wv},${wc}`,
      );
    }
    return rows.join('\n');
  }
}
