import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import nodemailer, { type Transporter } from 'nodemailer';
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient, User } from '@news/db';
import { loadEnv } from '../config/env';

@Injectable()
export class UsersService {
  private mailer: Transporter | null = null;

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  private getMailer(): Transporter | null {
    if (this.mailer) return this.mailer;
    const env = loadEnv();
    if (!env.SMTP_HOST) return null;
    this.mailer = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined,
    });
    return this.mailer;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  async list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });
  }

  async listPendingInvites() {
    const now = new Date();
    return this.prisma.userInvite.findMany({
      where: { acceptedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { email: true } } },
    });
  }

  async invite(
    invitedByUserId: string,
    email: string,
    displayName?: string,
  ): Promise<{ inviteUrl: string }> {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new ConflictException('email already in use');
    }

    // Cleanup any existing unexpired invite for this email
    await this.prisma.userInvite.deleteMany({
      where: { email, acceptedAt: null },
    });

    const env = loadEnv();
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    await this.prisma.userInvite.create({
      data: {
        email,
        invitedById: invitedByUserId,
        tokenHash,
        expiresAt,
      },
    });

    const inviteUrl = `${env.PUBLIC_BASE_URL}/admin/accept-invite?token=${encodeURIComponent(token)}${displayName ? `&name=${encodeURIComponent(displayName)}` : ''}`;

    // Try to send email (best-effort)
    const mailer = this.getMailer();
    if (mailer) {
      try {
        await mailer.sendMail({
          from: env.SMTP_FROM,
          to: email,
          subject: 'Lời mời tham gia News admin',
          text: `Bạn được mời tham gia trang quản trị. Hết hạn sau 24h.\n\nLink: ${inviteUrl}`,
          html: `<p>Bạn được mời tham gia <strong>News admin</strong>. Lời mời hết hạn sau 24h.</p><p><a href="${inviteUrl}">Bấm vào đây để chấp nhận lời mời</a></p>`,
        });
      } catch {
        // ignore — return URL so admin can copy manually
      }
    }

    return { inviteUrl };
  }

  async acceptInvite(token: string, displayName: string, password: string): Promise<User> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const invite = await this.prisma.userInvite.findUnique({ where: { tokenHash } });
    if (!invite) throw new BadRequestException('invalid invite');
    if (invite.acceptedAt) throw new BadRequestException('invite already accepted');
    if (invite.expiresAt < new Date()) throw new BadRequestException('invite expired');

    const existing = await this.prisma.user.findUnique({ where: { email: invite.email } });
    if (existing) throw new ConflictException('email already in use');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { email: invite.email, displayName, passwordHash },
    });
    await this.prisma.userInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    return user;
  }

  async revokeInvite(inviteId: string): Promise<void> {
    await this.prisma.userInvite.delete({ where: { id: inviteId } });
  }

  async deleteUser(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException('cannot delete yourself');
    }
    await this.prisma.user.delete({ where: { id } });
  }
}
