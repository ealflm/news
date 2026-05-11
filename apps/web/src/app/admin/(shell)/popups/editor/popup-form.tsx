'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { toast } from 'react-toastify';
import { GripVertical, Info, Link as LinkIcon, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { AdminPopup, LinkPlatform, LinkDevice } from '@news/shared';
import { BannerPicker } from '@/components/ui/banner-picker';
import { PopupMobilePreview } from './popup-mobile-preview';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DurationInput } from '@/components/ui/duration-input';
import { Input } from '@/components/ui/input';
import { LabelWithHelp } from '@/components/ui/tooltip';

const PLATFORMS: { value: LinkPlatform; label: string }[] = [
  { value: 'SHOPEE', label: 'Shopee' },
  { value: 'TIKTOK', label: 'TikTok Shop' },
  { value: 'LAZADA', label: 'Lazada' },
  { value: 'OTHER', label: 'Khác' },
];

const DEVICES: { value: LinkDevice; label: string; hint: string }[] = [
  { value: 'IOS_SAFARI', label: 'iOS Safari', hint: 'iPhone browser thật' },
  { value: 'IOS_FB', label: 'iOS Facebook', hint: 'In-app browser của Facebook iOS' },
  { value: 'ANDROID', label: 'Android', hint: 'Mọi Android browser' },
  {
    value: 'DESKTOP_FALLBACK',
    label: 'Desktop fallback',
    hint: 'Khi không match device nào ở trên',
  },
];

interface LinkRow {
  platform: LinkPlatform;
  device: LinkDevice;
  url: string;
  label?: string;
}

const TIPS = {
  name: 'Tên định danh nội bộ cho admin. Không hiển thị cho người dùng.',
  banner:
    'Ảnh banner popup. Có thể upload, crop, xoay và chọn tỉ lệ (vuông / dọc / 3:4 / 16:9...). Khuyến nghị 720×960 hoặc 600×800 cho popup mobile.',
  delay:
    'Số mili-giây chờ sau khi load trang trước khi popup xuất hiện.\n3000ms = 3 giây (mặc định).\nLớn hơn → bớt phiền, nhỏ hơn → aggressive.',
  cookieKey:
    'Tên cookie để remember "đã xem popup". Mỗi popup nên có key riêng để chạy đồng thời được.\nVD: popup_sale_55, popup_idol_korea',
  cookieTtl:
    'Khoảng thời gian popup không hiện lại sau khi user thấy/click X.\nVD: 1 ngày = user vào lại ngày mai sẽ thấy popup. 30 phút = chỉ ẩn nửa tiếng.',
  enabled: 'Master switch. Tắt → popup không xuất hiện ở đâu hết, kể cả bài đang gắn explicit.',
  isGlobal:
    'Bật → popup tự động xuất hiện trên MỌI bài viết đã publish.\nTắt → chỉ hiện ở bài admin gắn explicit qua post editor.',
  hideOnDesktop:
    'Bật → desktop browser không thấy popup.\nLý do: affiliate mobile commission cao hơn + desktop user thường là dev/admin/crawler.',
  hideOnBot:
    'Bật → Googlebot / FB crawler không thấy popup.\nTránh Google phạt "intrusive interstitial" + giấu mô hình monetization khỏi competitor.',
  forceClickOnClose:
    'User bấm X tưởng đóng popup → backend track click + redirect ra affiliate.\nCTR tăng đáng kể nhưng UX không thân thiện.',
  links:
    'Mỗi link tương ứng 1 cặp (sàn × thiết bị).\nRuntime chọn link đúng theo device user.\nVD: iOS Safari mở deeplink shopeevn://, iOS Facebook phải dùng URL web bình thường.',
};

export function PopupForm({ initial }: { initial?: AdminPopup }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [bannerUrl, setBannerUrl] = useState(initial?.bannerUrl ?? '');
  const [delayMs, setDelayMs] = useState(initial?.delayMs ?? 3000);
  const [cookieKey, setCookieKey] = useState(initial?.cookieKey ?? 'popup_3s');
  const [cookieTtlMinutes, setCookieTtlMinutes] = useState(initial?.cookieTtlMinutes ?? 1440);
  const [isGlobal, setIsGlobal] = useState(initial?.isGlobal ?? false);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [forceClickOnClose, setForceClickOnClose] = useState(initial?.forceClickOnClose ?? true);
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
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    const payload = {
      name,
      bannerUrl,
      delayMs,
      cookieKey,
      cookieTtlMinutes,
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
      toast.error(`Lưu thất bại (${res.status})`);
      return;
    }
    const p = await res.json();
    toast.success(initial ? 'Đã cập nhật popup' : 'Đã tạo popup');
    if (!initial) router.push(`/admin/popups/${p.id}/edit` as Route);
    else router.refresh();
  }

  async function del() {
    if (!initial) return;
    setConfirmDelete(false);
    setBusy(true);
    const r = await fetch(`/api/popups/${initial.id}`, { method: 'DELETE' });
    setBusy(false);
    if (!r.ok) {
      toast.error(`Xóa thất bại (${r.status})`);
      return;
    }
    toast.success('Đã xóa popup');
    router.push('/admin/popups' as Route);
  }

  const canSave = name.trim() && bannerUrl.trim() && cookieKey.trim();

  return (
    <div className="mx-auto grid w-full max-w-[1120px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Main */}
      <div className="space-y-5">
        {/* Banner card with mobile preview side-by-side */}
        <Card className="p-5">
          <SectionTitle title="Banner ảnh" tooltip={TIPS.banner} />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <BannerPicker value={bannerUrl} onChange={setBannerUrl} />
            </div>
            <div className="flex justify-center md:justify-end">
              <PopupMobilePreview
                bannerUrl={bannerUrl}
                delayMs={delayMs}
                forceClickOnClose={forceClickOnClose}
              />
            </div>
          </div>
        </Card>

        {/* Basics card */}
        <Card className="p-5 space-y-4">
          <SectionTitle title="Thông tin cơ bản" />

          <div>
            <LabelWithHelp htmlFor="p-name" tooltip={TIPS.name} required>
              Tên popup
            </LabelWithHelp>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Sale 5.5 Shopee"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <LabelWithHelp htmlFor="p-delay" tooltip={TIPS.delay}>
                Delay (ms)
              </LabelWithHelp>
              <Input
                id="p-delay"
                type="number"
                min={0}
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
              />
            </div>
            <div>
              <LabelWithHelp htmlFor="p-cookie" tooltip={TIPS.cookieKey} required>
                Cookie key
              </LabelWithHelp>
              <Input
                id="p-cookie"
                value={cookieKey}
                onChange={(e) => setCookieKey(e.target.value.replace(/[^a-z0-9_]/g, ''))}
                placeholder="popup_3s"
                className="font-mono"
              />
            </div>
          </div>

          <div>
            <LabelWithHelp tooltip={TIPS.cookieTtl}>Cookie hết hạn sau</LabelWithHelp>
            <DurationInput value={cookieTtlMinutes} onChange={setCookieTtlMinutes} min={1} />
          </div>
        </Card>

        {/* Links card */}
        <Card className="p-5">
          <SectionTitle title="Affiliate links" tooltip={TIPS.links} />
          {links.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-8 text-center">
              <LinkIcon className="mx-auto h-6 w-6 text-muted-fg" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-foreground">Chưa có link nào</p>
              <p className="mt-1 text-xs text-muted-fg">
                Thêm ít nhất 1 link cho mỗi platform × device combo
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {links.map((l, i) => (
                <li
                  key={i}
                  className="grid grid-cols-1 gap-2 rounded-md border border-border bg-surface p-2 sm:grid-cols-[auto_140px_160px_1fr_auto] sm:items-center"
                >
                  <GripVertical
                    className="hidden h-4 w-4 text-muted-fg sm:inline"
                    aria-hidden="true"
                  />
                  <select
                    value={l.platform}
                    onChange={(e) => updateLink(i, { platform: e.target.value as LinkPlatform })}
                    aria-label="Platform"
                    className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={l.device}
                    onChange={(e) => updateLink(i, { device: e.target.value as LinkDevice })}
                    aria-label="Device"
                    className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {DEVICES.map((d) => (
                      <option key={d.value} value={d.value} title={d.hint}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={l.url}
                    onChange={(e) => updateLink(i, { url: e.target.value })}
                    placeholder="https://..."
                    aria-label="Affiliate URL"
                    className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(i)}
                    aria-label={`Xóa link #${i + 1}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-fg hover:bg-destructive/10 hover:text-destructive no-tap-highlight"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={addLink}
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted no-tap-highlight"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Thêm link
          </button>
        </Card>
      </div>

      {/* Aside */}
      <aside className="space-y-4">
        {/* Status */}
        <Card className="p-5 space-y-3">
          <SectionTitle title="Trạng thái" />
          <CheckboxRow
            checked={enabled}
            onChange={setEnabled}
            label="Bật popup"
            tooltip={TIPS.enabled}
          />
          <CheckboxRow
            checked={isGlobal}
            onChange={setIsGlobal}
            label="Áp dụng global"
            tooltip={TIPS.isGlobal}
          />
        </Card>

        {/* Dark pattern */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="font-heading text-sm font-semibold text-foreground">Cấu hình ẩn</h3>
          </div>
          <CheckboxRow
            checked={hideOnDesktop}
            onChange={setHideOnDesktop}
            label="Ẩn trên desktop"
            tooltip={TIPS.hideOnDesktop}
          />
          <CheckboxRow
            checked={hideOnBot}
            onChange={setHideOnBot}
            label="Ẩn với crawler / bot"
            tooltip={TIPS.hideOnBot}
          />
          <CheckboxRow
            checked={forceClickOnClose}
            onChange={setForceClickOnClose}
            label="Click X = click affiliate"
            tooltip={TIPS.forceClickOnClose}
          />
        </Card>

        {/* Save card */}
        <Card className="p-5 space-y-3">
          <Button
            type="button"
            onClick={save}
            loading={busy}
            disabled={busy || !canSave}
            className="w-full"
          >
            {initial ? 'Lưu thay đổi' : 'Tạo popup'}
          </Button>
          {!canSave && (
            <p className="flex items-start gap-1 text-[11px] text-muted-fg">
              <Info className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
              Cần nhập tên, banner và cookie key trước khi lưu.
            </p>
          )}
          {initial && (
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="w-full"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Xóa popup
            </Button>
          )}
        </Card>
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        title={`Xóa popup "${initial?.name ?? ''}"?`}
        description="Hành động này không thể hoàn tác. Popup sẽ bị gỡ khỏi mọi bài viết đang gắn."
        variant="danger"
        confirmLabel="Xóa vĩnh viễn"
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void del()}
      />
    </div>
  );
}

function SectionTitle({ title, tooltip }: { title: string; tooltip?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
      {tooltip && (
        <span className="inline-flex">
          <LabelWithHelp tooltip={tooltip}>
            <span className="sr-only">Trợ giúp</span>
          </LabelWithHelp>
        </span>
      )}
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
  tooltip,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tooltip?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-primary"
      />
      <span className="flex-1">{label}</span>
      {tooltip && (
        <span onClick={(e) => e.preventDefault()}>
          <LabelWithHelp tooltip={tooltip}>
            <span className="sr-only">Trợ giúp</span>
          </LabelWithHelp>
        </span>
      )}
    </label>
  );
}
