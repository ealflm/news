import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient, Media } from '@news/db';
import { processImage } from './sharp.util';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { ALLOWED_IMAGE_MIME } from './upload.config';

// file-type is ESM-only; we declare the type inline to avoid moduleResolution issues
type FileTypeResult = { mime: string; ext: string };
type FileTypeModule = { fileTypeFromBuffer: (buf: Buffer) => Promise<FileTypeResult | undefined> };

@Injectable()
export class MediaService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly storage: LocalStorageProvider,
  ) {}

  async uploadImage(uploaderId: string, file: Express.Multer.File): Promise<Media> {
    if (!file?.buffer) throw new BadRequestException('no file');

    // Dynamic import because file-type is ESM-only
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fileTypeFromBuffer } = (await import('file-type')) as FileTypeModule;
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected || !ALLOWED_IMAGE_MIME.has(detected.mime)) {
      throw new BadRequestException(
        `File content does not match expected image mime: ${detected?.mime ?? 'unknown'}`,
      );
    }

    const id = randomUUID();
    const ext = detected.ext;

    const orig = await this.storage.saveBuffer('orig', `${id}.${ext}`, file.buffer);

    const result = await processImage(file.buffer);
    const variants: Record<string, string> = {};

    for (const [key, buf] of Object.entries(result.variants)) {
      const isOrig = key === 'orig';
      const format = key.includes('webp') ? 'webp' : key.includes('avif') ? 'avif' : 'jpg';
      const width = isOrig ? 'orig' : key.replace(/^(webp_|avif_)/, '');
      const filename = `${format}-${width}.${format === 'jpg' ? 'jpg' : format}`;
      const stored = await this.storage.saveBuffer(`variants/${id}`, filename, buf);
      variants[key] = stored.publicPath;
    }

    return this.prisma.media.create({
      data: {
        kind: 'IMAGE',
        originalPath: orig.publicPath,
        variants: variants as never,
        width: result.width,
        height: result.height,
        sizeBytes: BigInt(file.size),
        mimeType: detected.mime,
        uploadedById: uploaderId,
      },
    });
  }

  async getById(id: string): Promise<Media> {
    const m = await this.prisma.media.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('media not found');
    return m;
  }

  async list(query: { cursor?: string; limit: number; kind?: string }) {
    const where: { kind?: 'IMAGE' | 'VIDEO' | 'EMBED' } = {};
    if (query.kind) where.kind = query.kind as never;
    const items = await this.prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const nextCursor = items.length > query.limit ? (items[query.limit]?.id ?? null) : null;
    return { items: items.slice(0, query.limit), nextCursor };
  }

  async delete(id: string): Promise<void> {
    const m = await this.getById(id);
    if (m.originalPath) await this.storage.delete(m.originalPath);
    if (m.variants && typeof m.variants === 'object') {
      for (const v of Object.values(m.variants as Record<string, string>)) {
        await this.storage.delete(v);
      }
      await this.storage.delete(`/uploads/variants/${id}`);
    }
    await this.prisma.media.delete({ where: { id } });
  }
}
