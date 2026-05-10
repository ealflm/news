import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient, User } from '@news/db';

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }
}
