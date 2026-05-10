import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { prisma } from '@news/db';

let app: INestApplication;
let authCookie: string;
const testEmail = 'e2e-posts@local.test';
const testPassword = 'PostsTest123!';

beforeAll(async () => {
  await prisma.post.deleteMany({ where: { author: { email: testEmail } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.user.create({
    data: {
      email: testEmail,
      displayName: 'PostsTester',
      passwordHash: await bcrypt.hash(testPassword, 10),
    },
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api');
  await app.init();

  const login = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: testEmail, password: testPassword });
  const cookies = login.headers['set-cookie'] as unknown as string[];
  authCookie = cookies.find((c) => c.startsWith('access_token='))!;
});

afterAll(async () => {
  await prisma.post.deleteMany({ where: { author: { email: testEmail } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await app?.close();
  await prisma.$disconnect();
});

describe('Posts CRUD', () => {
  let postId: string;

  it('creates a post (admin)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/posts')
      .set('Cookie', authCookie)
      .send({ title: 'Tin tức mới hôm nay' });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('tin-tuc-moi-hom-nay');
    expect(res.body.status).toBe('DRAFT');
    postId = res.body.id;
  });

  it('rejects create without auth', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/posts')
      .send({ title: 'should fail' });
    expect(res.status).toBe(401);
  });

  it('lists admin posts', async () => {
    const res = await request(app.getHttpServer()).get('/api/posts').set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('updates a post', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/posts/${postId}`)
      .set('Cookie', authCookie)
      .send({ title: 'Tin tức đã sửa', excerpt: 'tóm tắt' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Tin tức đã sửa');
    expect(res.body.slug).toBe('tin-tuc-da-sua');
  });

  it('publishes a post', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/posts/${postId}/publish`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
    expect(res.body.publishedAt).toBeTruthy();
  });

  it('returns published post on public endpoint', async () => {
    const res = await request(app.getHttpServer()).get('/api/posts/published/tin-tuc-da-sua');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Tin tức đã sửa');
  });

  it('does not return draft on public endpoint', async () => {
    const draft = await prisma.post.create({
      data: {
        slug: 'draft-only',
        title: 'Draft only',
        contentJson: { type: 'doc', content: [] },
        contentHtml: '',
        status: 'DRAFT',
        author: { connect: { email: testEmail } },
      },
    });
    const res = await request(app.getHttpServer()).get('/api/posts/published/draft-only');
    expect(res.status).toBe(200);
    // NestJS serializes null return as empty JSON object {}; supertest parses that as {}
    expect(res.body).toEqual({});
    await prisma.post.delete({ where: { id: draft.id } });
  });

  it('unpublishes a post', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/posts/${postId}/unpublish`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DRAFT');
  });

  it('deletes a post', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/posts/${postId}`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(204);
    const check = await request(app.getHttpServer())
      .get(`/api/posts/${postId}`)
      .set('Cookie', authCookie);
    expect(check.status).toBe(404);
  });
});
