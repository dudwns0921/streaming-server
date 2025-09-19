import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const basePath =
    process.env.NODE_ENV === 'production' ? '/streaming-server' : '';

  app.use(
    `${basePath}/upload`,
    express.static('public/pages', { index: 'upload.html' }),
  );
  app.use(
    `${basePath}/test`,
    express.static('public/pages', { index: 'test.html' }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
