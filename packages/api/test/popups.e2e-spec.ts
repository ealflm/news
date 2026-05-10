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
const testEmail = 'e2e-popups@local.test';
const testPassword = 'PopupsTest123!';

beforeAll(async () => {
  await prisma.clickEvent.deleteMany({});
  await prisma.postPopupOverride.deleteMany({});
  await prisma.popupLink.deleteMany({});
  await prisma.popup.deleteMany({});
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.user.create({
    data: {
      email: testEmail,
      displayName: 'PopupsTester',
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
  await prisma.clickEvent.deleteMany({});
  await prisma.postPopupOverride.deleteMany({});
  await prisma.popupLink.deleteMany({});
  await prisma.popup.deleteMany({});
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await app?.close();
  await prisma.$disconnect();
});

describe('Popups CRUD + bundle', () => {
  let popupId: string;

  it('creates a popup with links', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/popups')
      .set('Cookie', authCookie)
      .send({
        name: 'Shopee 3s',
        bannerUrl: 'https://example.com/banner.jpg',
        delayMs: 3000,
        cookieKey: 'popup_3s',
        isGlobal: true,
        links: [
          { platform: 'SHOPEE', device: 'IOS_SAFARI', url: 'https://shopee.vn/x' },
          { platform: 'SHOPEE', device: 'ANDROID', url: 'intent://shopee.vn/x' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.cookieKey).toBe('popup_3s');
    expect(res.body.links.length).toBe(2);
    popupId = res.body.id;
  });

  it('rejects unauth create', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/popups')
      .send({ name: 'x', bannerUrl: 'https://x', delayMs: 100, cookieKey: 'x' });
    expect(res.status).toBe(401);
  });

  it('lists popups', async () => {
    const res = await request(app.getHttpServer()).get('/api/popups').set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('updates popup, bumps configVersion', async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/popups/${popupId}`)
      .set('Cookie', authCookie);
    const v0 = before.body.configVersion as number;
    const res = await request(app.getHttpServer())
      .patch(`/api/popups/${popupId}`)
      .set('Cookie', authCookie)
      .send({ name: 'Shopee Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Shopee Updated');
    expect(res.body.configVersion).toBe(v0 + 1);
  });

  it('returns bundle for a post (with global popup)', async () => {
    const post = await prisma.post.create({
      data: {
        slug: 'popup-test',
        title: 'Popup test',
        contentJson: { type: 'doc', content: [] },
        contentHtml: '',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        author: { connect: { email: testEmail } },
      },
    });

    const res = await request(app.getHttpServer()).get(`/api/popup-bundle/${post.id}`);
    expect(res.status).toBe(200);
    expect(res.body.empty).toBe(false);
    expect(res.body.js).toContain('popup_3s');
    expect(res.body.base64.length).toBeGreaterThan(100);

    await prisma.post.delete({ where: { id: post.id } });
  });

  it('detached override removes global popup from bundle', async () => {
    const post = await prisma.post.create({
      data: {
        slug: 'no-popup',
        title: 'No popup',
        contentJson: { type: 'doc', content: [] },
        contentHtml: '',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        author: { connect: { email: testEmail } },
      },
    });

    await request(app.getHttpServer())
      .post(`/api/popups/overrides/${post.id}`)
      .set('Cookie', authCookie)
      .send([{ popupId, action: 'DETACH' }]);

    const res = await request(app.getHttpServer()).get(`/api/popup-bundle/${post.id}`);
    expect(res.status).toBe(200);
    expect(res.body.empty).toBe(true);

    await prisma.post.delete({ where: { id: post.id } });
  });

  it('click endpoint accepts valid token, ignores invalid', async () => {
    const post = await prisma.post.create({
      data: {
        slug: 'click-test',
        title: 'Click',
        contentJson: { type: 'doc', content: [] },
        contentHtml: '',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        author: { connect: { email: testEmail } },
      },
    });
    const bundleRes = await request(app.getHttpServer()).get(`/api/popup-bundle/${post.id}`);
    const js = bundleRes.body.js as string;
    const tokenMatch = js.match(/"token":"([^"]+)"/);
    expect(tokenMatch).toBeTruthy();
    const token = tokenMatch![1];

    const beforeCount = await prisma.clickEvent.count();
    const click = await request(app.getHttpServer()).get(`/api/click/${token}?t=image`);
    expect(click.status).toBe(204);
    await new Promise((r) => setTimeout(r, 200));
    const afterCount = await prisma.clickEvent.count();
    expect(afterCount).toBe(beforeCount + 1);

    const click2 = await request(app.getHttpServer()).get('/api/click/bogus-token?t=close');
    expect(click2.status).toBe(204);

    await prisma.post.delete({ where: { id: post.id } });
  });

  it('deletes popup', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/popups/${popupId}`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(204);
  });
});
