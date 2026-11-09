import type { INestApplication } from '@nestjs/common';
import { platformOptions } from './platform/platform.controller.ts';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.ts';
import { ApiErrorFilter } from './common/api-error.filter.ts';
import { PlatformStore } from './legacy/platform/store.ts';
export async function bootstrap(
  options: typeof platformOptions = {},
  configure?: (app: INestApplication) => void,
) {
  Object.assign(platformOptions, options);
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.useGlobalFilters(new ApiErrorFilter());
  const origins = (
    process.env.CORS_ORIGINS ??
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174'
  ).split(',');
  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.enableShutdownHooks();
  const store = app.get(PlatformStore);
  configure?.(app);
  const server = await app.listen(
    Number(process.env.API_PORT ?? 3001),
    process.env.API_HOST ?? '127.0.0.1',
  );
  server.on('close', () => {
    if (store.db.open) store.close();
  });
  return app;
}
if (!process.env.APPBUILDER_TEST_IMPORT) void bootstrap();
