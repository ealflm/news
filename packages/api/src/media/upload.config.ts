import { BadRequestException } from '@nestjs/common';
import { memoryStorage, type Options } from 'multer';

export const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
]);

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

// Keep for backward compat (still used by controller)
export const imageUploadOptions: Options = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 }, // use the larger limit
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.has(file.mimetype) || ALLOWED_VIDEO_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException(`Mime type not allowed: ${file.mimetype}`));
    }
  },
};

// Alias
export const uploadOptions = imageUploadOptions;
