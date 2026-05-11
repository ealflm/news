'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import type { AdminPopup, LinkPlatform, LinkDevice } from '@news/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PLATFORMS: LinkPlatform[] = ['SHOPEE', 'TIKTOK', 'LAZADA', 'OTHER'];
const DEVICES: LinkDevice[] = ['IOS_FB', 'IOS_SAFARI', 'ANDROID', 'DESKTOP_FALLBACK'];

interface LinkRow {
  platform: LinkPlatform;
  device: LinkDevice;
  url: string;
  label?: string;
}

export function PopupForm({ initial }: { initial?: AdminPopup }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [bannerUrl, setBannerUrl] = useState(initial?.bannerUrl ?? '');
  const [delayMs, setDelayMs] = useState(initial?.delayMs ?? 3000);
  const [cookieKey, setCookieKey] = useState(initial?.cookieKey ?? 'popup_3s');
  const [cookieDays, setCookieDays] = useState(initial?.cookieDays ?? 1);
  const [isGlobal, setIsGlobal] = useState(initial?.isGlobal ?? false);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [forceClickOnClose, setForceClickOnClose] = useState(initial?.forceClickOnClose ?? false);
  const [hideOnDesktop, setHideOnDesktop] = useState(initial?.hideOnDesktop ?? true);
  const [hideOnBot, setHideOnBot] = useState(initial?.hideOnBot ?? true);
  const [links, setLinks] = useState<LinkRow[]>(
    initial?.links.map((l) => ({
      platform: l.platform,
      device: l.device,
      url: l.url,
      label: l.label ?? '',
    })) ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addLink() {
    setLinks([...links, { platform: 'SHOPEE', device: 'IOS_SAFARI', url: '' }]);
  }
  function removeLink(i: number) {
    setLinks(links.filter((_, idx) => idx !== i));
  }
  function updateLink(i: number, patch: Partial<LinkRow>) {
    setLinks(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const payload = {
      name,
      bannerUrl,
      delayMs,
      cookieKey,
      cookieDays,
      isGlobal,
      enabled,
      forceClickOnClose,
      hideOnDesktop,
      hideOnBot,
      links: links.filter((l) => l.url.trim()),
    };
    const url = initial ? `/api/popups/${initial.id}` : '/api/popups';
    const method = initial ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      setErr(`Lưu thất bại (${res.status})`);
      return;
    }
    const p = await res.json();
    if (!initial) router.push(`/admin/popups/${p.id}/edit` as Route);
    else router.refresh();
  }

  async function del() {
    if (!initial) return;
    if (!confirm('Xóa popup?')) return;
    setBusy(true);
    await fetch(`/api/popups/${initial.id}`, { method: 'DELETE' });
    setBusy(false);
    router.push('/admin/popups' as Route);
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Tên</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Banner URL</label>
          <Input
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Delay (ms)</label>
            <Input
              type="number"
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Cookie key</label>
            <Input value={cookieKey} onChange={(e) => setCookieKey(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Cookie days</label>
            <Input
              type="number"
              value={cookieDays}
              onChange={(e) => setCookieDays(Number(e.target.value))}
            />
          </div>
        </div>

        <fieldset className="rounded-lg border border-border p-3">
          <legend className="text-sm font-medium text-ink">Affiliate links</legend>
          {links.map((l, i) => (
            <div key={i} className="mb-2 grid grid-cols-12 gap-1">
              <select
                value={l.platform}
                onChange={(e) => updateLink(i, { platform: e.target.value as LinkPlatform })}
                className="col-span-2 rounded-md border border-border bg-surface px-2 py-1 text-sm text-ink"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={l.device}
                onChange={(e) => updateLink(i, { device: e.target.value as LinkDevice })}
                className="col-span-2 rounded-md border border-border bg-surface px-2 py-1 text-sm text-ink"
              >
                {DEVICES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                value={l.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                placeholder="https://..."
                className="col-span-7 rounded-md border border-border bg-surface px-2 py-1 text-sm text-ink placeholder:text-muted-fg"
              />
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="col-span-1 rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-muted no-tap-highlight"
              >
                X
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLink}
            className="text-sm text-accent hover:underline no-tap-highlight"
          >
            + Thêm link
          </button>
        </fieldset>
      </div>

      <aside className="space-y-3">
        <label className="block text-sm text-ink">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />{' '}
          Bật popup
        </label>
        <label className="block text-sm text-ink">
          <input
            type="checkbox"
            checked={isGlobal}
            onChange={(e) => setIsGlobal(e.target.checked)}
          />{' '}
          Áp dụng global (tất cả bài)
        </label>
        <hr className="border-border" />
        <p className="text-xs font-semibold text-muted-fg">Chế độ ẩn / dark pattern</p>
        <label className="block text-sm text-ink">
          <input
            type="checkbox"
            checked={hideOnDesktop}
            onChange={(e) => setHideOnDesktop(e.target.checked)}
          />{' '}
          Ẩn trên desktop
        </label>
        <label className="block text-sm text-ink">
          <input
            type="checkbox"
            checked={hideOnBot}
            onChange={(e) => setHideOnBot(e.target.checked)}
          />{' '}
          Ẩn với crawler/bot
        </label>
        <label className="block text-sm text-ink">
          <input
            type="checkbox"
            checked={forceClickOnClose}
            onChange={(e) => setForceClickOnClose(e.target.checked)}
          />{' '}
          Click "X" cũng = click affiliate
        </label>
        <hr className="border-border" />
        <Button
          type="button"
          onClick={save}
          loading={busy}
          disabled={busy || !name || !bannerUrl || !cookieKey}
          className="w-full"
        >
          {busy ? 'Đang lưu...' : initial ? 'Cập nhật' : 'Tạo popup'}
        </Button>
        {err && <p className="text-sm text-destructive">{err}</p>}
        {initial && (
          <Button type="button" variant="danger" onClick={del} disabled={busy} className="w-full">
            Xóa popup
          </Button>
        )}
      </aside>
    </div>
  );
}
