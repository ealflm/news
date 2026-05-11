import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient, Media } from '@news/db';
import { processImage } from './sharp.util';
import { probeVideo } from './video.util';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { ALLOWED_IMAGE_MIME, ALLOWED_VIDEO_MIME } from './upload.config';
import { createMediaQueue } from './queue/media-queue.config';

// file-type is ESM-only; we declare the type inline to avoid moduleResolution issues
type FileTypeResult = { mime: string; ext: string };
type FileTypeModule = { fileTypeFromBuffer: (buf: Buffer) => Promise<FileTypeResult | undefined> };

type EmbedProvider = 'youtube' | 'tiktok' | 'facebook';

@Injectable()
export class MediaService {
  private readonly queue = createMediaQueue();

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly storage: LocalStorageProvider,
  ) {}

  async uploadFile(uploaderId: string, file: Express.Multer.File): Promise<Media> {
    if (!file?.buffer) throw new BadRequestException('no file');

    // Dynamic import because file-type is ESM-only; ts-expect-error suppresses moduleResolution warning
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error file-type is ESM-only and requires node16/bundler moduleResolution
    const { fileTypeFromBuffer } = (await import('file-type')) as FileTypeModule;
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected) {
      throw new BadRequestException('Unrecognized file content');
    }

    if (ALLOWED_IMAGE_MIME.has(detected.mime)) {
      return this.uploadImage(uploaderId, file, detected);
    }
    if (ALLOWED_VIDEO_MIME.has(detected.mime)) {
      return this.uploadVideo(uploaderId, file, detected);
    }
    throw new BadRequestException(`Unsupported mime type: ${detected.mime}`);
  }

  // Keep backward compat for controller that calls uploadImage directly
  async uploadImage(
    uploaderId: string,
    file: Express.Multer.File,
    detected?: FileTypeResult,
  ): Promise<Media> {
    if (!file?.buffer) throw new BadRequestException('no file');

    let detectedMime = detected;
    if (!detectedMime) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error file-type is ESM-only and requires node16/bundler moduleResolution
      const { fileTypeFromBuffer } = (await import('file-type')) as FileTypeModule;
      const d = await fileTypeFromBuffer(file.buffer);
      if (!d || !ALLOWED_IMAGE_MIME.has(d.mime)) {
        throw new BadRequestException(
          `File content does not match expected image mime: ${d?.mime ?? 'unknown'}`,
        );
      }
      detectedMime = d;
    }

    const id = randomUUID();
    const ext = detectedMime.ext;

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
        mimeType: detectedMime.mime,
        uploadedById: uploaderId,
      },
    });
  }

  private async uploadVideo(
    uploaderId: string,
    file: Express.Multer.File,
    detected: FileTypeResult,
  ): Promise<Media> {
    const id = randomUUID();
    const orig = await this.storage.saveBuffer('orig', `${id}.${detected.ext}`, file.buffer);
    const fsPath = this.storage.resolveFsPath(orig.publicPath);

    // Probe synchronously to get dimensions+duration up front
    let meta = { width: 0, height: 0, durationSec: 0 };
    try {
      meta = await probeVideo(fsPath);
    } catch {
      // ignore; worker can re-probe
    }

    const media = await this.prisma.media.create({
      data: {
        kind: 'VIDEO',
        originalPath: orig.publicPath,
        variants: {} as never, // worker fills in
        width: meta.width || null,
        height: meta.height || null,
        durationSec: meta.durationSec || null,
        sizeBytes: BigInt(file.size),
        mimeType: detected.mime,
        uploadedById: uploaderId,
      },
    });

    // Enqueue async processing
    await this.queue.add(
      'video',
      { mediaId: media.id, originalFsPath: fsPath },
      { removeOnComplete: 100, removeOnFail: 50, attempts: 2 },
    );

    return media;
  }

  async createEmbed(uploaderId: string, embedUrl: string): Promise<Media> {
    const provider = detectEmbedProvider(embedUrl);
    if (!provider) {
      throw new BadRequestException('Unrecognized embed URL');
    }

    let html: string | null = null;
    try {
      html = await fetchOEmbed(embedUrl, provider);
    } catch {
      // fallback to provider-specific iframe builder
    }
    if (!html) {
      html = buildFallbackEmbedHtml(embedUrl, provider);
    }

    return this.prisma.media.create({
      data: {
        kind: 'EMBED',
        originalPath: null,
        variants: { url: embedUrl, provider, html } as never,
        mimeType: `text/html; provider=${provider}`,
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
        if (typeof v === 'string' && v.startsWith('/uploads/')) {
          await this.storage.delete(v);
        }
      }
      await this.storage.delete(`/uploads/variants/${id}`);
    }
    await this.prisma.media.delete({ where: { id } });
  }
}

function detectEmbedProvider(url: string): EmbedProvider | null {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
  return null;
}

async function fetchOEmbed(url: string, provider: EmbedProvider): Promise<string | null> {
  const endpoint =
    provider === 'youtube'
      ? `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      : provider === 'tiktok'
        ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
        : null; // Facebook oEmbed needs app token; skip
  if (!endpoint) return null;
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { html?: string };
  return data.html ?? null;
}

function buildFallbackEmbedHtml(url: string, provider: EmbedProvider): string {
  if (provider === 'youtube') {
    // extract video ID
    const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    if (m) {
      return `<iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    }
  }
  if (provider === 'tiktok') {
    const m = url.match(/\/video\/(\d+)/);
    if (m) {
      return `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${m[1]}"><a href="${url}"></a></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`;
    }
  }
  if (provider === 'facebook') {
    return `<iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false" frameborder="0" allowfullscreen></iframe>`;
  }
  return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
}
