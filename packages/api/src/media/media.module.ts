import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { VideoWorkerService } from './queue/video-worker.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService, LocalStorageProvider, VideoWorkerService],
  exports: [MediaService, LocalStorageProvider],
})
export class MediaModule {}
