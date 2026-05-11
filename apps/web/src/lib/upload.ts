import type { MediaRecord } from '@news/shared';

export interface MediaUploadResult {
  ok: boolean;
  status: number;
  media?: MediaRecord;
  error?: string;
}

export interface UploadOptions {
  onProgress?: (percent: number, loaded: number, total: number) => void;
  signal?: AbortSignal;
}

/**
 * Upload a file to /api/media via XHR (fetch lacks upload-progress events).
 * Emits 0-100% via opts.onProgress. Returns the parsed response.
 */
export function uploadMedia(file: File, opts: UploadOptions = {}): Promise<MediaUploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media');

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return;
      const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
      opts.onProgress?.(percent, e.loaded, e.total);
    });

    xhr.addEventListener('load', () => {
      const status = xhr.status;
      let media: MediaRecord | undefined;
      try {
        const parsed = JSON.parse(xhr.responseText) as { media?: MediaRecord };
        media = parsed.media;
      } catch {
        // parse error
      }
      const ok = status >= 200 && status < 300;
      resolve(ok && media ? { ok, status, media } : { ok: false, status, error: 'upload_failed' });
    });

    xhr.addEventListener('error', () => resolve({ ok: false, status: 0, error: 'network_error' }));
    xhr.addEventListener('abort', () => resolve({ ok: false, status: 0, error: 'aborted' }));

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
        return;
      }
      opts.signal.addEventListener('abort', () => xhr.abort());
    }

    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}
