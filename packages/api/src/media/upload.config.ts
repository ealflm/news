import { BadRequestException } from '@nestjs/common';
import { memoryStorage, type Options } from 'multer';

export const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export const imageUploadOptions: Options = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      cb(new BadRequestException(`Mime type not allowed: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
};
