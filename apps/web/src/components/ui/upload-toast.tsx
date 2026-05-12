'use client';

import { useEffect, useState } from 'react';
import { toast, type Id } from 'react-toastify';
import { uploadMedia, type MediaUploadResult } from '@/lib/upload';

type Phase = 'uploading' | 'processing' | 'success' | 'error';

interface UploadToastBodyProps {
  filename: string;
  phase: Phase;
  percent: number;
  errorMsg?: string | undefined;
}

function PhaseLabel({
  phase,
  percent,
  errorMsg,
}: {
  phase: Phase;
  percent: number;
  errorMsg?: string | undefined;
}) {
  if (phase === 'success') return <>Hoàn tất</>;
  if (phase === 'error') return <>{errorMsg ?? 'Lỗi'}</>;
  if (phase === 'uploading') return <>Đang tải lên… {percent}%</>;
  return <ProcessingTimer />;
}

// Lightweight elapsed-seconds counter so users know the server is alive.
// Resets to 0 each time it mounts (i.e. when phase flips to "processing").
function ProcessingTimer() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <>Đang xử lý ảnh… {secs}s</>;
}

function UploadToastBody({ filename, phase, percent, errorMsg }: UploadToastBodyProps) {
  const indeterminate = phase === 'processing';
  const error = phase === 'error';
  return (
    <div className="min-w-[240px] text-ink">
      <p className="truncate text-sm font-medium">{filename}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-pill bg-muted">
          {indeterminate ? (
            <span
              aria-hidden="true"
              className="upload-indeterminate absolute inset-y-0 w-2/5 rounded-pill bg-primary"
            />
          ) : (
            <div
              className={`h-full transition-[width] duration-200 ease-out ${
                error ? 'bg-destructive' : 'bg-primary'
              }`}
              style={{ width: `${percent}%` }}
            />
          )}
        </div>
        {!indeterminate && (
          <span className="w-10 shrink-0 text-right text-[11px] font-medium tabular-nums text-muted-fg">
            {percent}%
          </span>
        )}
      </div>
      <p className={`mt-0.5 text-[11px] ${error ? 'text-destructive' : 'text-muted-fg'}`}>
        <PhaseLabel phase={phase} percent={percent} errorMsg={errorMsg} />
      </p>
    </div>
  );
}

/**
 * Upload a media file with a phased progress toast.
 *
 * Phase 1 (uploading): determinate bar, percent label.
 * Phase 2 (processing): indeterminate shimmer + elapsed-seconds counter,
 *   shown while the server resizes/encodes variants (can take several seconds).
 * Terminal: success or error toast with auto-dismiss.
 */
export async function uploadMediaWithToast(
  file: File,
  opts: {
    onPercent?: (p: number) => void;
    /** Dismiss the toast silently on success (caller will show its own confirmation). */
    silentSuccess?: boolean;
  } = {},
): Promise<MediaUploadResult> {
  const filename = file.name || 'file';
  const id: Id = toast(<UploadToastBody filename={filename} phase="uploading" percent={0} />, {
    isLoading: true,
    autoClose: false,
    closeOnClick: false,
    hideProgressBar: true,
    closeButton: false,
    type: 'default',
  });

  const result = await uploadMedia(file, {
    onProgress: (percent) => {
      opts.onPercent?.(percent);
      toast.update(id, {
        render: <UploadToastBody filename={filename} phase="uploading" percent={percent} />,
      });
    },
    onUploaded: () => {
      toast.update(id, {
        render: <UploadToastBody filename={filename} phase="processing" percent={100} />,
      });
    },
  });

  if (result.ok) {
    if (opts.silentSuccess) {
      toast.dismiss(id);
    } else {
      toast.update(id, {
        render: <UploadToastBody filename={filename} phase="success" percent={100} />,
        type: 'success',
        isLoading: false,
        autoClose: 1800,
        closeOnClick: true,
        hideProgressBar: false,
        closeButton: true,
      });
    }
  } else {
    const errorMsg =
      result.error === 'network_error'
        ? 'Mất kết nối mạng'
        : result.error === 'aborted'
          ? 'Đã hủy'
          : `Lỗi ${result.status || 'không rõ'}`;
    toast.update(id, {
      render: (
        <UploadToastBody filename={filename} phase="error" percent={100} errorMsg={errorMsg} />
      ),
      type: 'error',
      isLoading: false,
      autoClose: 4000,
      closeOnClick: true,
      hideProgressBar: false,
      closeButton: true,
    });
  }

  return result;
}
