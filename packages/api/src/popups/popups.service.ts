import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient, Popup } from '@news/db';
import type { CreatePopupInput, UpdatePopupInput, PostPopupOverrideInput } from '@news/shared';

@Injectable()
export class PopupsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async create(input: CreatePopupInput): Promise<Popup> {
    return this.prisma.popup.create({
      data: {
        name: input.name,
        bannerUrl: input.bannerUrl,
        delayMs: input.delayMs,
        isGlobal: input.isGlobal ?? false,
        enabled: input.enabled ?? true,
        cookieKey: input.cookieKey,
        cookieTtlMinutes: input.cookieTtlMinutes ?? 1440,
        forceClickOnClose: input.forceClickOnClose ?? false,
        hideOnDesktop: input.hideOnDesktop ?? true,
        hideOnBot: input.hideOnBot ?? true,
        ignoreCookie: input.ignoreCookie ?? false,
        links: {
          create: input.links.map((l) => ({
            platform: l.platform,
            device: l.device,
            url: l.url,
            label: l.label ?? null,
          })),
        },
      },
      include: { links: true },
    });
  }

  async update(id: string, input: UpdatePopupInput): Promise<Popup> {
    const existing = await this.prisma.popup.findUnique({
      where: { id },
      include: { links: true },
    });
    if (!existing) throw new NotFoundException('popup not found');

    const data: Record<string, unknown> = { configVersion: { increment: 1 } };
    if (input.name !== undefined) data.name = input.name;
    if (input.bannerUrl !== undefined) data.bannerUrl = input.bannerUrl;
    if (input.delayMs !== undefined) data.delayMs = input.delayMs;
    if (input.isGlobal !== undefined) data.isGlobal = input.isGlobal;
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.cookieKey !== undefined) data.cookieKey = input.cookieKey;
    if (input.cookieTtlMinutes !== undefined) data.cookieTtlMinutes = input.cookieTtlMinutes;
    if (input.forceClickOnClose !== undefined) data.forceClickOnClose = input.forceClickOnClose;
    if (input.hideOnDesktop !== undefined) data.hideOnDesktop = input.hideOnDesktop;
    if (input.hideOnBot !== undefined) data.hideOnBot = input.hideOnBot;
    if (input.ignoreCookie !== undefined) data.ignoreCookie = input.ignoreCookie;

    if (input.links) {
      await this.prisma.popupLink.deleteMany({ where: { popupId: id } });
      await this.prisma.popupLink.createMany({
        data: input.links.map((l) => ({
          popupId: id,
          platform: l.platform,
          device: l.device,
          url: l.url,
          label: l.label ?? null,
        })),
      });
    }

    return this.prisma.popup.update({
      where: { id },
      data: data as never,
      include: { links: true },
    });
  }

  async list() {
    return this.prisma.popup.findMany({ include: { links: true }, orderBy: { createdAt: 'desc' } });
  }

  async getById(id: string) {
    const p = await this.prisma.popup.findUnique({ where: { id }, include: { links: true } });
    if (!p) throw new NotFoundException('popup not found');
    return p;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.clickEvent.deleteMany({ where: { popupId: id } });
    await this.prisma.postPopupOverride.deleteMany({ where: { popupId: id } });
    await this.prisma.popupLink.deleteMany({ where: { popupId: id } });
    await this.prisma.popup.delete({ where: { id } });
  }

  async listApplicableForPost(postId: string) {
    const overrides = await this.prisma.postPopupOverride.findMany({ where: { postId } });
    const detached = new Set(overrides.filter((o) => o.action === 'DETACH').map((o) => o.popupId));
    const attached = overrides.filter((o) => o.action === 'ATTACH').map((o) => o.popupId);

    const globals = await this.prisma.popup.findMany({
      where: { isGlobal: true, enabled: true },
      include: { links: true },
    });
    const localAttached = await this.prisma.popup.findMany({
      where: { id: { in: attached }, enabled: true },
      include: { links: true },
    });

    const map = new Map<string, (typeof globals)[number]>();
    for (const p of [...globals, ...localAttached]) {
      if (!detached.has(p.id)) map.set(p.id, p);
    }
    return [...map.values()];
  }

  async setOverrides(postId: string, overrides: PostPopupOverrideInput[]): Promise<void> {
    await this.prisma.postPopupOverride.deleteMany({ where: { postId } });
    if (overrides.length === 0) return;
    await this.prisma.postPopupOverride.createMany({
      data: overrides.map((o, i) => ({
        postId,
        popupId: o.popupId,
        action: o.action,
        order: i,
      })),
    });
  }

  async getOverrides(postId: string) {
    return this.prisma.postPopupOverride.findMany({
      where: { postId },
      orderBy: { order: 'asc' },
    });
  }

  async incrementClick(popupId: string, postId: string | null, trigger: string): Promise<void> {
    await this.prisma.clickEvent.create({
      data: { popupId, postId, trigger, sessionId: null, device: null },
    });
  }
}
