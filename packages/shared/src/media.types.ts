import type { MediaKind, ImageVariants } from './media.schemas';

export interface MediaRecord {
  id: string;
  kind: MediaKind;
  originalPath: string | null;
  variants: ImageVariants | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  mimeType: string | null;
  alt: string | null;
  createdAt: string;
}

export interface UploadResponse {
  media: MediaRecord;
}

export interface MediaListResponse {
  items: MediaRecord[];
  nextCursor: string | null;
}
