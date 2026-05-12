'use client';

import { useEffect, useState } from 'react';
import { ImageIcon, ImageOff, Lock, Wifi, BatteryFull, Signal, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  bannerUrl: string;
  delayMs: number;
  forceClickOnClose: boolean;
}

/**
 * Phone mockup that previews how the popup will appear on a real mobile device.
 * Replicates the runtime template visuals: 85% black scrim, centered banner
 * with 300px max width, translucent-glass circular X button top-right.
 */
export function PopupMobilePreview({ bannerUrl, delayMs, forceClickOnClose }: Props) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Read current hostname client-side so the mockup matches the deploy domain.
  // SSR-safe: shows placeholder until hydrated.
  const [hostname, setHostname] = useState('your-site.com');
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      setHostname(window.location.hostname);
    }
  }, []);

  const [bannerLoadError, setBannerLoadError] = useState(false);
  useEffect(() => setBannerLoadError(false), [bannerUrl]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone frame */}
      <div className="relative h-[640px] w-[320px] overflow-hidden rounded-[36px] border-[10px] border-ink bg-ink shadow-2xl ring-1 ring-black/20">
        {/* Notch */}
        <div className="absolute left-1/2 top-1 z-30 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />

        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[26px] bg-white">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-2 text-[10px] font-semibold text-ink">
            <span className="tabular-nums">{time}</span>
            <div className="flex items-center gap-1">
              <Signal className="h-3 w-3" aria-hidden="true" />
              <Wifi className="h-3 w-3" aria-hidden="true" />
              <BatteryFull className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>

          {/* Fake article content */}
          <div className="px-4 pt-4">
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-fg">
              <Lock className="h-2.5 w-2.5" aria-hidden="true" />
              {hostname}
            </div>
            <div className="space-y-2">
              <div className="h-3 w-4/5 rounded bg-muted" />
              <div className="h-3 w-3/5 rounded bg-muted" />
            </div>
            <div className="mt-3 aspect-[16/10] w-full rounded bg-muted/70" />
            <div className="mt-3 space-y-1.5">
              <div className="h-2 w-full rounded bg-muted/60" />
              <div className="h-2 w-11/12 rounded bg-muted/60" />
              <div className="h-2 w-9/12 rounded bg-muted/60" />
            </div>
          </div>

          {/* Popup overlay */}
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85">
            {bannerUrl ? (
              <div className="relative w-[78%]">
                <button
                  type="button"
                  className={cn(
                    'absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-md ring-1 ring-white/15 backdrop-blur-md transition-colors',
                    forceClickOnClose && 'ring-2 ring-destructive/70',
                  )}
                  aria-label="Đóng"
                  tabIndex={-1}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                </button>
                {bannerLoadError ? (
                  <div className="flex w-full flex-col items-center justify-center gap-1.5 rounded-[10px] border-2 border-dashed border-destructive/50 bg-black/40 px-3 py-8 text-center">
                    <ImageOff className="h-5 w-5 text-destructive/90" aria-hidden="true" />
                    <span className="text-[11px] font-medium text-destructive/90">
                      Không tải được ảnh
                    </span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="block w-full rounded-[10px] object-cover"
                    onError={() => setBannerLoadError(true)}
                  />
                )}
              </div>
            ) : (
              <div className="flex w-[78%] flex-col items-center gap-2 rounded-[10px] border-2 border-dashed border-white/40 bg-black/40 px-4 py-10 text-center text-[11px] text-white/70">
                <ImageIcon className="h-6 w-6" aria-hidden="true" />
                <span>Chưa có banner</span>
                <span className="text-[10px] text-white/40">Upload ảnh để xem preview</span>
              </div>
            )}
          </div>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-1 left-1/2 z-30 h-1 w-24 -translate-x-1/2 rounded-full bg-white/80" />
      </div>

      {/* Meta info */}
      <div className="space-y-1 text-center text-[11px] text-muted-fg">
        <p>
          Xuất hiện sau{' '}
          <span className="font-medium text-ink tabular-nums">
            {(delayMs / 1000).toFixed(delayMs % 1000 === 0 ? 0 : 1)}s
          </span>
        </p>
        {forceClickOnClose && (
          <p className="inline-flex items-center gap-1 rounded-pill border border-destructive/30 bg-destructive/5 px-2 py-0.5 text-[10px] font-medium text-destructive">
            Nút X = click affiliate
          </p>
        )}
      </div>
    </div>
  );
}
