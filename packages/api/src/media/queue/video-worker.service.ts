import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import { PRISMA } from '../../prisma/prisma.module';
import type { PrismaClient } from '@news/db';
import { LocalStorageProvider } from '../storage/local-storage.provider';
import { extractPoster, probeVideo, transcodeToMp4720p } from '../video.util';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { MEDIA_QUEUE_NAME, getRedisConnection, type VideoJobData } from './media-queue.config';

@Injectable()
export class VideoWorkerService implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<VideoJobData> | null = null;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly storage: LocalStorageProvider,
  ) {}

  onModuleInit() {
    this.worker = new Worker<VideoJobData>(
      MEDIA_QUEUE_NAME,
      async (job: Job<VideoJobData>) => {
        const { mediaId, originalFsPath } = job.data;
        const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
        if (!media) return;

        // Re-probe metadata (idempotent)
        let meta = {
          width: media.width ?? 0,
          height: media.height ?? 0,
          durationSec: media.durationSec ?? 0,
        };
        if (!meta.width || !meta.durationSec) {
          try {
            meta = await probeVideo(originalFsPath);
          } catch {
            // continue with what we have
          }
        }

        // Output paths
        const variantsDir = dirname(originalFsPath).replace('/orig', `/variants/${mediaId}`);
        await fs.mkdir(variantsDir, { recursive: true });
        const transcodedFs = join(variantsDir, '720p.mp4');
        const posterFs = join(variantsDir, 'poster.jpg');

        await transcodeToMp4720p(originalFsPath, transcodedFs);
        try {
          await extractPoster(originalFsPath, posterFs);
        } catch {
          // poster optional
        }

        const transcodedPublic = `/uploads/variants/${mediaId}/720p.mp4`;
        const posterPublic = `/uploads/variants/${mediaId}/poster.jpg`;

        await this.prisma.media.update({
          where: { id: mediaId },
          data: {
            variants: { '720p': transcodedPublic, poster: posterPublic } as never,
            width: meta.width || media.width,
            height: meta.height || media.height,
            durationSec: meta.durationSec || media.durationSec,
          },
        });
      },
      { connection: getRedisConnection(), concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      console.error(`[video-worker] job ${job?.id} failed:`, err);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
