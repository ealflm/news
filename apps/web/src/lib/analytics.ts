import { cookies } from 'next/headers';
import type {
  AnalyticsOverviewResponse,
  AnalyticsByDevice,
  AnalyticsByPlatform,
  AnalyticsByHour,
  AnalyticsFunnel,
  AnalyticsReferrer,
} from '@news/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<Record<string, string>> {
  const c = (await cookies()).get('access_token');
  return c ? { cookie: `access_token=${c.value}` } : {};
}

export async function getAnalyticsOverview(daysWindow = 7): Promise<AnalyticsOverviewResponse> {
  const res = await fetch(`${API_URL}/api/analytics/overview?window=${daysWindow}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`overview failed: ${res.status}`);
  return res.json();
}

interface RangeQuery {
  from: Date | string;
  to: Date | string;
}

function toRangeParams(q: RangeQuery): string {
  const from = typeof q.from === 'string' ? q.from : q.from.toISOString();
  const to = typeof q.to === 'string' ? q.to : q.to.toISOString();
  return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

export async function getByDevice(q: RangeQuery): Promise<AnalyticsByDevice[]> {
  const r = await fetch(`${API_URL}/api/analytics/by-device?${toRangeParams(q)}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) return [];
  return r.json();
}

export async function getByPlatform(q: RangeQuery): Promise<AnalyticsByPlatform[]> {
  const r = await fetch(`${API_URL}/api/analytics/by-platform?${toRangeParams(q)}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) return [];
  return r.json();
}

export async function getByHour(q: RangeQuery): Promise<AnalyticsByHour[]> {
  const r = await fetch(`${API_URL}/api/analytics/by-hour?${toRangeParams(q)}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) return [];
  return r.json();
}

export async function getFunnel(q: RangeQuery): Promise<AnalyticsFunnel> {
  const r = await fetch(`${API_URL}/api/analytics/funnel?${toRangeParams(q)}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) return { views: 0, eligible: 0, clicks: 0 };
  return r.json();
}

export async function getTopReferrers(q: RangeQuery, limit = 10): Promise<AnalyticsReferrer[]> {
  const r = await fetch(`${API_URL}/api/analytics/referrers?${toRangeParams(q)}&limit=${limit}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) return [];
  return r.json();
}
