import { cookies } from 'next/headers';
import type { AnalyticsOverviewResponse } from '@news/shared';

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
