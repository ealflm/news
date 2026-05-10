import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import type { Request } from 'express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../auth/zod.pipe';
import { imageUploadOptions } from './upload.config';
import { ListMediaQuerySchema, type ListMediaQuery } from '@news/shared';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', imageUploadOptions as MulterOptions))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const user = req.user as { sub: string };
    const m = await this.media.uploadImage(user.sub, file);
    return { media: serializeMedia(m) };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Query(new ZodValidationPipe(ListMediaQuerySchema)) q: ListMediaQuery) {
    const result = await this.media.list({
      ...(q.cursor !== undefined ? { cursor: q.cursor } : {}),
      limit: q.limit,
      ...(q.kind !== undefined ? { kind: q.kind } : {}),
    });
    return { items: result.items.map(serializeMedia), nextCursor: result.nextCursor };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return serializeMedia(await this.media.getById(id));
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.media.delete(id);
  }
}

function serializeMedia(m: {
  id: string;
  kind: string;
  originalPath: string | null;
  variants: unknown;
  width: number | null;
  height: number | null;
  sizeBytes: bigint | null;
  mimeType: string | null;
  alt: string | null;
  createdAt: Date;
}) {
  return {
    id: m.id,
    kind: m.kind,
    originalPath: m.originalPath,
    variants: m.variants,
    width: m.width,
    height: m.height,
    sizeBytes: m.sizeBytes != null ? Number(m.sizeBytes) : null,
    mimeType: m.mimeType,
    alt: m.alt,
    createdAt: m.createdAt.toISOString(),
  };
}
