import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { AppModule } from '../src/app.module';
import { prisma } from '@news/db';
import bcrypt from 'bcrypt';

let app: INestApplication;

const testEmail = 'e2e-auth@local.test';
const testPassword = 'Password123!';

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.user.create({
    data: {
      email: testEmail,
      displayName: 'E2E',
      passwordHash: await bcrypt.hash(testPassword, 10),
    },
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api');
  await app.init();
});

afterAll(async () => {
  await app?.close();
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe('POST /api/auth/login', () => {
  it('returns 200 with cookies on valid creds', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'bad', password: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without cookie', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user with valid cookie', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });
    const cookie = (login.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('access_token='),
    )!;

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testEmail);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues new access token from refresh cookie', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });
    const refreshCookie = (login.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('refresh_token='),
    )!;

    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears cookies', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/logout');
    expect(res.status).toBe(204);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token=;'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token=;'))).toBe(true);
  });
});
