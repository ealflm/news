import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Request } from 'express';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../auth/zod.pipe';
import { AuditService } from '../audit/audit.service';
import {
  CreatePostInputSchema,
  UpdatePostInputSchema,
  ListPostsQuerySchema,
  type CreatePostInput,
  type UpdatePostInput,
  type ListPostsQuery,
} from '@news/shared';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly posts: PostsService,
    private readonly audit: AuditService,
  ) {}

  // Public read
  @Get('published')
  async listPublic(
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursor?: string,
    @Query('q') q?: string,
  ) {
    const limit = Math.min(Math.max(Number(limitRaw ?? 20), 1), 50);
    const cleanQ = (q ?? '').trim().slice(0, 100);
    return this.posts.listPublished({
      limit,
      ...(cursor ? { cursor } : {}),
      ...(cleanQ ? { q: cleanQ } : {}),
    });
  }

  @Get('published/:slug')
  async getPublic(@Param('slug') slug: string) {
    const post = await this.posts.getPublishedBySlug(slug);
    if (!post) return null;
    void this.posts.incrementViewCount(slug);
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      contentHtml: post.contentHtml,
      coverImageUrl: post.coverImageUrl,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      author: post.author,
      seoTitle: post.seoTitle,
      seoDesc: post.seoDesc,
      ogImageUrl: post.ogImageUrl,
      viewCount: post.viewCount,
    };
  }

  // Sitemap data (no auth — public consumption)
  @Get('sitemap-data')
  async sitemap() {
    const items = await this.posts.listAllPublishedForSitemap();
    return items.map((p) => ({
      slug: p.slug,
      publishedAt: p.publishedAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  // Admin
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Query(new ZodValidationPipe(ListPostsQuerySchema)) query: ListPostsQuery) {
    return this.posts.listAdmin(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.posts.getById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(CreatePostInputSchema))
  async create(@Body() body: CreatePostInput, @Req() req: Request) {
    const user = req.user as { sub: string };
    const post = await this.posts.create(user.sub, body);
    void this.audit.record({
      actorId: user.sub,
      action: 'post.create',
      targetType: 'post',
      targetId: post.id,
      meta: { title: post.title, slug: post.slug },
    });
    return post;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePostInputSchema)) body: UpdatePostInput,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: string };
    const post = await this.posts.update(id, body);
    void this.audit.record({
      actorId: user.sub,
      action: 'post.update',
      targetType: 'post',
      targetId: id,
      meta: { title: post.title },
    });
    return post;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/publish')
  @HttpCode(200)
  async publish(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { sub: string };
    const post = await this.posts.publish(id);
    void this.audit.record({
      actorId: user.sub,
      action: 'post.publish',
      targetType: 'post',
      targetId: id,
      meta: { title: post.title },
    });
    return post;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/unpublish')
  @HttpCode(200)
  async unpublish(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { sub: string };
    const post = await this.posts.unpublish(id);
    void this.audit.record({
      actorId: user.sub,
      action: 'post.unpublish',
      targetType: 'post',
      targetId: id,
      meta: { title: post.title },
    });
    return post;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { sub: string };
    void this.audit.record({
      actorId: user.sub,
      action: 'post.delete',
      targetType: 'post',
      targetId: id,
    });
    return this.posts.delete(id);
  }
}
