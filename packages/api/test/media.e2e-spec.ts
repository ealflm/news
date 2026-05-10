import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import bcrypt from 'bcrypt';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { prisma } from '@news/db';

let app: INestApplication;
let authCookie: string;
const testEmail = 'e2e-media@local.test';
const testPassword = 'MediaTest123!';

beforeAll(async () => {
  await prisma.media.deleteMany({ where: { uploadedBy: { email: testEmail } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.user.create({
    data: {
      email: testEmail,
      displayName: 'MediaTester',
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
  await prisma.media.deleteMany({ where: { uploadedBy: { email: testEmail } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await app?.close();
  await prisma.$disconnect();
});

async function makeTestPng(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .png()
    .toBuffer();
}

describe('Media upload', () => {
  let uploadedId: string;

  it('rejects upload without auth', async () => {
    const buf = await makeTestPng();
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .attach('file', buf, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('uploads PNG and returns variants', async () => {
    const buf = await makeTestPng();
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Cookie', authCookie)
      .attach('file', buf, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.media.id).toBeDefined();
    expect(res.body.media.kind).toBe('IMAGE');
    expect(res.body.media.width).toBe(800);
    expect(res.body.media.height).toBe(600);
    expect(res.body.media.originalPath).toMatch(/^\/uploads\/orig\/.+\.png$/);
    expect(res.body.media.variants).toBeDefined();
    expect(Object.keys(res.body.media.variants).length).toBeGreaterThan(0);
    uploadedId = res.body.media.id;
  });

  it('rejects oversized file', async () => {
    const tooBig = Buffer.alloc(21 * 1024 * 1024, 0);
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Cookie', authCookie)
      .attach('file', tooBig, { filename: 'big.png', contentType: 'image/png' });
    expect([400, 413]).toContain(res.status);
  });

  it('rejects non-image file by content', async () => {
    const txt = Buffer.from('not an image at all');
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Cookie', authCookie)
      .attach('file', txt, { filename: 'fake.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('lists uploaded media', async () => {
    const res = await request(app.getHttpServer()).get('/api/media').set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.find((i: { id: string }) => i.id === uploadedId)).toBeTruthy();
  });

  it('deletes uploaded media and removes files', async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/media/${uploadedId}`)
      .set('Cookie', authCookie);
    const orig = before.body.originalPath as string;

    const del = await request(app.getHttpServer())
      .delete(`/api/media/${uploadedId}`)
      .set('Cookie', authCookie);
    expect(del.status).toBe(204);

    const check = await request(app.getHttpServer())
      .get(`/api/media/${uploadedId}`)
      .set('Cookie', authCookie);
    expect(check.status).toBe(404);

    const fsPath = resolve(
      process.env.UPLOADS_DIR ?? '/home/ealflm/dev/news/uploads',
      orig.replace(/^\/uploads\//, ''),
    );
    let exists = true;
    try {
      await fs.access(fsPath);
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });
});
