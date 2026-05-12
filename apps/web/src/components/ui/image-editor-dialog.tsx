'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, RotateCcw, RotateCw, X } from 'lucide-react';
import Cropper, { type Area } from 'react-easy-crop';
import type { MediaRecord } from '@news/shared';
import { Button } from '@/components/ui/button';
import { uploadMediaWithToast } from '@/components/ui/upload-toast';
import { cn } from '@/lib/cn';

type AspectPreset = { label: string; value: number | undefined; ratio: string };

const ASPECT_PRESETS: AspectPreset[] = [
  { label: 'Tự do', value: undefined, ratio: 'free' },
  { label: 'Popup', value: 3 / 4, ratio: '3:4' },
  { label: 'Vuông', value: 1, ratio: '1:1' },
  { label: 'Ngang', value: 16 / 9, ratio: '16:9' },
  { label: 'Dọc', value: 9 / 16, ratio: '9:16' },
  { label: 'Banner', value: 4 / 3, ratio: '4:3' },
  { label: 'Story', value: 2 / 3, ratio: '2:3' },
];

interface Props {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onDone: (media: MediaRecord, url: string) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for absolute URLs that need CORS — data: URLs don't
    // and tainting blob URLs would also fail.
    if (/^https?:\/\//i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

async function renderCropped(src: string, pixelCrop: Area, rotation: number): Promise<Blob> {
  const img = await loadImage(src);
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const rotatedW = img.width * cos + img.height * sin;
  const rotatedH = img.width * sin + img.height * cos;

  const off = document.createElement('canvas');
  off.width = rotatedW;
  off.height = rotatedH;
  const offCtx = off.getContext('2d');
  if (!offCtx) throw new Error('canvas 2d unavailable');
  offCtx.translate(rotatedW / 2, rotatedH / 2);
  offCtx.rotate(radians);
  offCtx.drawImage(img, -img.width / 2, -img.height / 2);

  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(pixelCrop.width));
  out.height = Math.max(1, Math.round(pixelCrop.height));
  const outCtx = out.getContext('2d');
  if (!outCtx) throw new Error('canvas 2d unavailable');
  outCtx.drawImage(
    off,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
      'image/jpeg',
      0.92,
    );
  });
}

export function ImageEditorDialog({ open, imageSrc, onClose, onDone }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(1);
  const [pixelCrop, setPixelCrop] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(1);
    setPixelCrop(null);
    setBusy(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (busy) return;
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setPixelCrop(areaPx);
  }, []);

  async function save() {
    if (!pixelCrop) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await renderCropped(imageSrc, pixelCrop, rotation);
      const file = new File([blob], `banner-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const res = await uploadMediaWithToast(file);
      if (res.ok && res.media) {
        const v = res.media.variants as Record<string, string> | null;
        const path = v?.['1280w'] ?? v?.['720w'] ?? v?.['320w'] ?? res.media.originalPath ?? null;
        const finalUrl = path ? `${API_URL}${path}` : '';
        onDone(res.media, finalUrl);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'render failed';
      // Most common: canvas tainted (CORS) — fall back to uploading source as-is.
      if (msg.includes('tainted') || msg.includes('SecurityError')) {
        setError('Không thể đọc lại ảnh đang sửa do CORS. Hãy upload ảnh mới thay vì sửa ảnh cũ.');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="img-editor-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <h2
            id="img-editor-title"
            className="font-heading text-base font-semibold text-foreground"
          >
            Chỉnh sửa ảnh
          </h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-40 no-tap-highlight"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="relative h-[60vh] min-h-[360px] w-full shrink-0 bg-ink/95">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              {...(aspect !== undefined ? { aspect } : {})}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              objectFit="contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
              Không có ảnh để chỉnh sửa
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border bg-bg/40 px-5 py-3">
          {/* Aspect presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-fg">Tỉ lệ:</span>
            {ASPECT_PRESETS.map((p) => {
              const active = aspect === p.value;
              return (
                <button
                  key={p.ratio}
                  type="button"
                  onClick={() => setAspect(p.value)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium no-tap-highlight',
                    active
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-border bg-surface text-foreground hover:bg-muted',
                  )}
                >
                  {p.label}
                  <span className="text-[10px] opacity-70">{p.ratio}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs font-medium text-muted-fg">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-fg">
                {zoom.toFixed(2)}x
              </span>
            </label>
            <label className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs font-medium text-muted-fg">Xoay</span>
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                aria-label="Xoay trái 90°"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted no-tap-highlight"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                aria-label="Xoay phải 90°"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted no-tap-highlight"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-fg">
                {rotation}°
              </span>
            </label>
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-50 no-tap-highlight"
          >
            Hủy
          </button>
          <Button type="button" onClick={save} disabled={!pixelCrop || busy} loading={busy}>
            <Check className="h-4 w-4" aria-hidden="true" />
            Lưu ảnh
          </Button>
        </footer>
      </div>
    </div>
  );
}
