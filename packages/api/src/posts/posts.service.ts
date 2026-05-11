import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient, Post, PostStatus } from '@news/db';
import type { CreatePostInput, UpdatePostInput, ListPostsQuery } from '@news/shared';
import { makeSlug, appendDedupeSuffix } from './slug.util';
import { renderTiptapToHtml } from './tiptap-render.util';

@Injectable()
export class PostsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async create(authorId: string, input: CreatePostInput): Promise<Post> {
    const slug = await this.uniqueSlug(input.slug ?? makeSlug(input.title));
    const contentJson = input.contentJson ?? { type: 'doc', content: [] };
    const contentHtml = renderTiptapToHtml(contentJson);
    return this.prisma.post.create({
      data: {
        slug,
        title: input.title,
        excerpt: input.excerpt ?? null,
        contentJson: contentJson as never,
        contentHtml,
        coverImageUrl: input.coverImageUrl ?? null,
        status: input.status ?? 'DRAFT',
        publishedAt: input.publishedAt
          ? new Date(input.publishedAt)
          : input.status === 'PUBLISHED'
            ? new Date()
            : null,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        seoTitle: input.seoTitle ?? null,
        seoDesc: input.seoDesc ?? null,
        ogImageUrl: input.ogImageUrl ?? null,
        authorId,
      },
    });
  }

  async update(id: string, input: UpdatePostInput): Promise<Post> {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('post not found');

    let slug = existing.slug;
    if (input.slug && input.slug !== existing.slug) {
      slug = await this.uniqueSlug(input.slug, existing.id);
    } else if (input.title && !input.slug && existing.status === 'DRAFT') {
      slug = await this.uniqueSlug(makeSlug(input.title), existing.id);
    }

    const contentJson = input.contentJson ?? existing.contentJson;
    const contentHtml =
      input.contentJson !== undefined ? renderTiptapToHtml(contentJson) : existing.contentHtml;

    return this.prisma.post.update({
      where: { id },
      data: {
        slug,
        title: input.title ?? existing.title,
        excerpt: input.excerpt !== undefined ? input.excerpt : existing.excerpt,
        contentJson: contentJson as never,
        contentHtml,
        coverImageUrl:
          input.coverImageUrl !== undefined ? input.coverImageUrl : existing.coverImageUrl,
        status: input.status ?? existing.status,
        publishedAt: input.publishedAt
          ? new Date(input.publishedAt)
          : input.publishedAt === undefined
            ? existing.publishedAt
            : null,
        scheduledAt: input.scheduledAt
          ? new Date(input.scheduledAt)
          : input.scheduledAt === undefined
            ? existing.scheduledAt
            : null,
        seoTitle: input.seoTitle !== undefined ? input.seoTitle : existing.seoTitle,
        seoDesc: input.seoDesc !== undefined ? input.seoDesc : existing.seoDesc,
        ogImageUrl: input.ogImageUrl !== undefined ? input.ogImageUrl : existing.ogImageUrl,
      },
    });
  }

  async publish(id: string): Promise<Post> {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('post not found');
    return this.prisma.post.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: existing.publishedAt ?? new Date() },
    });
  }

  async unpublish(id: string): Promise<Post> {
    return this.prisma.post.update({ where: { id }, data: { status: 'DRAFT' } });
  }

  async getById(id: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('post not found');
    return post;
  }

  async getPublishedBySlug(
    slug: string,
  ): Promise<(Post & { author: { displayName: string } }) | null> {
    return this.prisma.post.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: { author: { select: { displayName: true } } },
    });
  }

  async listAdmin(query: ListPostsQuery) {
    const where: { status?: PostStatus; OR?: unknown[] } = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { slug: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const items = await this.prisma.post.findMany({
      where: where as never,
      orderBy: { updatedAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const nextCursor = items.length > query.limit ? (items[query.limit]?.id ?? null) : null;
    return { items: items.slice(0, query.limit), nextCursor };
  }

  async listPublished(query: { cursor?: string; limit: number; q?: string }) {
    const where: { status: PostStatus; OR?: unknown[] } = { status: 'PUBLISHED' };
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { excerpt: { contains: query.q, mode: 'insensitive' } },
        { slug: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const items = await this.prisma.post.findMany({
      where: where as never,
      orderBy: { publishedAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { author: { select: { displayName: true } } },
    });
    const nextCursor = items.length > query.limit ? (items[query.limit]?.id ?? null) : null;
    return { items: items.slice(0, query.limit), nextCursor };
  }

  async listAllPublishedForSitemap(): Promise<
    { slug: string; publishedAt: Date; updatedAt: Date }[]
  > {
    return this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    }) as never;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.post.delete({ where: { id } });
  }

  async incrementViewCount(slug: string): Promise<void> {
    await this.prisma.post.updateMany({
      where: { slug, status: 'PUBLISHED' },
      data: { viewCount: { increment: 1 } },
    });
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let n = 1;
    while (true) {
      const candidate = appendDedupeSuffix(base, n);
      const existing = await this.prisma.post.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      n += 1;
      if (n > 1000) throw new ConflictException('slug collision exhausted');
    }
  }
}
