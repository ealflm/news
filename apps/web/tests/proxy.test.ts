import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../src/proxy';

vi.mock('../src/lib/auth', () => ({
  verifyAccessToken: async (token: string) =>
    token === 'valid' ? { sub: 'u1', email: 'a@b.co', type: 'access' } : null,
}));

function makeReq(path: string, cookie?: string) {
  const url = `http://localhost${path}`;
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return new NextRequest(url, { headers });
}

describe('admin proxy', () => {
  it('lets /admin/login through unauthenticated', async () => {
    const res = await proxy(makeReq('/admin/login'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects /admin to /admin/login when no cookie', async () => {
    const res = await proxy(makeReq('/admin'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/login');
  });

  it('redirects /admin to /admin/login when token invalid', async () => {
    const res = await proxy(makeReq('/admin', 'access_token=bad'));
    expect(res.status).toBe(307);
  });

  it('passes /admin through with valid token', async () => {
    const res = await proxy(makeReq('/admin', 'access_token=valid'));
    expect(res.status).toBe(200);
  });

  it('does not gate /', async () => {
    const res = await proxy(makeReq('/'));
    expect(res.status).toBe(200);
  });

  it('passes /api/posts through with valid access_token', async () => {
    const res = await proxy(makeReq('/api/posts', 'access_token=valid'));
    expect(res.status).toBe(200);
  });

  it('returns 401 JSON on /api/posts with no cookie', async () => {
    const res = await proxy(makeReq('/api/posts'));
    expect(res.status).toBe(401);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('returns 401 JSON on /api/posts with invalid access and no refresh', async () => {
    const res = await proxy(makeReq('/api/posts', 'access_token=bad'));
    expect(res.status).toBe(401);
    expect(res.headers.get('location')).toBeNull();
  });

  it('does not gate /api/auth/login', async () => {
    const res = await proxy(makeReq('/api/auth/login'));
    expect(res.status).toBe(200);
  });

  it('does not gate /api/auth/logout', async () => {
    const res = await proxy(makeReq('/api/auth/logout'));
    expect(res.status).toBe(200);
  });

  it('does not gate /api/analytics/view', async () => {
    const res = await proxy(makeReq('/api/analytics/view'));
    expect(res.status).toBe(200);
  });
});
