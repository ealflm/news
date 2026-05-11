import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient, User } from '@news/db';

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  async list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
      },
    });
  }

  async createUser(input: {
    username: string;
    password: string;
    displayName: string;
  }): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { username: input.username },
    });
    if (existing) throw new ConflictException('username already in use');
    const passwordHash = await bcrypt.hash(input.password, 12);
    return this.prisma.user.create({
      data: {
        username: input.username,
        displayName: input.displayName,
        passwordHash,
      },
    });
  }

  async setPassword(userId: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async deleteUser(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException('cannot delete yourself');
    }
    await this.prisma.user.delete({ where: { id } });
  }
}
