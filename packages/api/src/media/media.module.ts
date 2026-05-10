import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { LocalStorageProvider } from './storage/local-storage.provider';

@Module({
  controllers: [MediaController],
  providers: [MediaService, LocalStorageProvider],
  exports: [MediaService, LocalStorageProvider],
})
export class MediaModule {}
