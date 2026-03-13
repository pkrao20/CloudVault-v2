import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Ensure storage directories exist
  const storagePath = path.join(process.cwd(), 'storage');
  const tmpPath = path.join(storagePath, 'tmp');
  fs.mkdirSync(storagePath, { recursive: true });
  fs.mkdirSync(tmpPath, { recursive: true });

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`CloudVault is running on port ${port}`);
}

bootstrap();
