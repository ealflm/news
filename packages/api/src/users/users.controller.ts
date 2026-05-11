import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../auth/zod.pipe';
import { UsersService } from './users.service';
import {
  CreateUserInputSchema,
  SetPasswordInputSchema,
  type CreateUserInput,
  type SetPasswordInput,
} from '@news/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list() {
    const items = await this.users.list();
    return items.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(201)
  async create(@Body(new ZodValidationPipe(CreateUserInputSchema)) body: CreateUserInput) {
    const user = await this.users.createUser(body);
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/password')
  @HttpCode(204)
  async setPassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetPasswordInputSchema)) body: SetPasswordInput,
  ) {
    await this.users.setPassword(id, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  async deleteUser(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { sub: string };
    await this.users.deleteUser(id, user.sub);
  }
}
