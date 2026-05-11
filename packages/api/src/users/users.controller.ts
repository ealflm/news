import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../auth/zod.pipe';
import { UsersService } from './users.service';
import {
  InviteUserInputSchema,
  AcceptInviteInputSchema,
  type InviteUserInput,
  type AcceptInviteInput,
} from '@news/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // PUBLIC: accept invite (no auth)
  @Post('accept-invite')
  @HttpCode(201)
  async acceptInvite(
    @Body(new ZodValidationPipe(AcceptInviteInputSchema)) body: AcceptInviteInput,
  ) {
    const user = await this.users.acceptInvite(body.token, body.displayName, body.password);
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  // ADMIN endpoints
  @UseGuards(JwtAuthGuard)
  @Get()
  async list() {
    const items = await this.users.list();
    return items.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('invites')
  async listInvites() {
    const items = await this.users.listPendingInvites();
    return items.map((i) => ({
      id: i.id,
      email: i.email,
      invitedByEmail: i.invitedBy?.email ?? null,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Post('invite')
  @HttpCode(201)
  async invite(
    @Body(new ZodValidationPipe(InviteUserInputSchema)) body: InviteUserInput,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: string };
    const result = await this.users.invite(user.sub, body.email, body.displayName);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('invites/:id')
  @HttpCode(204)
  async revokeInvite(@Param('id') id: string) {
    await this.users.revokeInvite(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  async deleteUser(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { sub: string };
    await this.users.deleteUser(id, user.sub);
  }
}
