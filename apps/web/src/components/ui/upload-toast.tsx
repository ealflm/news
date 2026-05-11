'use client';

import { toast, type Id } from 'react-toastify';
import { uploadMedia, type MediaUploadResult } from '@/lib/upload';

interface UploadToastBodyProps {
  filename: string;
  percent: number;
  done?: 'success' | 'error' | null;
  errorMsg?: string;
}

function UploadToastBody({ filename, percent, done, errorMsg }: UploadToastBodyProps) {
  const label =
    done === 'success'
      ? 'Hoàn tất'
      : done === 'error'
        ? (errorMsg ?? 'Lỗi')
        : percent < 100
          ? 'Đang tải lên…'
          : 'Đang xử lý…';
  return (
    <div className="min-w-[240px] text-ink">
      <p className="truncate text-sm font-medium">{filename}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-muted">
          <div
            className={`h-full transition-[width] duration-200 ease-out ${
              done === 'error' ? 'bg-destructive' : 'bg-primary'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-right text-[11px] font-medium tabular-nums text-muted-fg">
          {percent}%
        </span>
      </div>
      <p
        className={`mt-0.5 text-[11px] ${done === 'error' ? 'text-destructive' : 'text-muted-fg'}`}
      >
        {label}
      </p>
    </div>
  );
}

/**
 * Upload a media file with live progress toast.
 *
 * Shows a toast with a progress bar that updates from 0→100%.
 * When server returns 200, transitions to a brief success toast.
 * On failure transitions to an error toast.
 */
export async function uploadMediaWithToast(
  file: File,
  opts: { onPercent?: (p: number) => void } = {},
): Promise<MediaUploadResult> {
  const filename = file.name || 'file';
  const id: Id = toast(<UploadToastBody filename={filename} percent={0} />, {
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
        render: <UploadToastBody filename={filename} percent={percent} />,
      });
    },
  });

  if (result.ok) {
    toast.update(id, {
      render: <UploadToastBody filename={filename} percent={100} done="success" />,
      type: 'success',
      isLoading: false,
      autoClose: 1800,
      closeOnClick: true,
      hideProgressBar: false,
      closeButton: true,
    });
  } else {
    const errorMsg =
      result.error === 'network_error'
        ? 'Mất kết nối mạng'
        : result.error === 'aborted'
          ? 'Đã hủy'
          : `Lỗi ${result.status || 'không rõ'}`;
    toast.update(id, {
      render: (
        <UploadToastBody filename={filename} percent={100} done="error" errorMsg={errorMsg} />
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
