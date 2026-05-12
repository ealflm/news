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
});
