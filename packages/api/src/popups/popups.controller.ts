import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../auth/zod.pipe';
import { PopupsService } from './popups.service';
import {
  CreatePopupInputSchema,
  UpdatePopupInputSchema,
  PostPopupOverrideInputSchema,
  type CreatePopupInput,
  type UpdatePopupInput,
  type PostPopupOverrideInput,
} from '@news/shared';
import { z } from 'zod';

const OverridesArraySchema = z.array(PostPopupOverrideInputSchema);

@Controller('popups')
@UseGuards(JwtAuthGuard)
export class PopupsController {
  constructor(private readonly popups: PopupsService) {}

  @Get()
  async list() {
    return (await this.popups.list()).map(serializePopup);
  }

  @Get('overrides/:postId')
  async getOverrides(@Param('postId') postId: string) {
    return this.popups.getOverrides(postId);
  }

  @Post('overrides/:postId')
  @HttpCode(204)
  async setOverrides(
    @Param('postId') postId: string,
    @Body(new ZodValidationPipe(OverridesArraySchema)) body: PostPopupOverrideInput[],
  ) {
    await this.popups.setOverrides(postId, body);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return serializePopup(await this.popups.getById(id));
  }

  @Post()
  @HttpCode(201)
  async create(@Body(new ZodValidationPipe(CreatePopupInputSchema)) body: CreatePopupInput) {
    return serializePopup(await this.popups.create(body));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePopupInputSchema)) body: UpdatePopupInput,
  ) {
    return serializePopup(await this.popups.update(id, body));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.popups.delete(id);
  }
}

function serializePopup(p: {
  id: string;
  name: string;
  bannerUrl: string;
  delayMs: number;
  isGlobal: boolean;
  enabled: boolean;
  cookieKey: string;
  cookieTtlMinutes: number;
  forceClickOnClose: boolean;
  hideOnDesktop: boolean;
  hideOnBot: boolean;
  configVersion: number;
  links?: { id: string; platform: string; device: string; url: string; label: string | null }[];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    bannerUrl: p.bannerUrl,
    delayMs: p.delayMs,
    isGlobal: p.isGlobal,
    enabled: p.enabled,
    cookieKey: p.cookieKey,
    cookieTtlMinutes: p.cookieTtlMinutes,
    forceClickOnClose: p.forceClickOnClose,
    hideOnDesktop: p.hideOnDesktop,
    hideOnBot: p.hideOnBot,
    configVersion: p.configVersion,
    links: p.links ?? [],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
