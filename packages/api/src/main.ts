import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { cors: false });

  app.use(
    helmet({
      // Allow uploads and embeds to be loaded by the web origin (localhost:3000 vs API :4000)
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: env.PUBLIC_BASE_URL,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api');

  await app.listen(env.PORT);
  console.log(`API listening on :${env.PORT}`);
}

bootstrap();
