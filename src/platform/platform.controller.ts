import { All, Controller, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { resolve } from 'node:path';
import { createApiHandler } from '../legacy/app.ts';
import { createPlatform } from '../legacy/platform/http.ts';
import { PlatformStore } from '../legacy/platform/store.ts';
import { JsonPageRepository } from '../legacy/repository.ts';
import { JsonBlockRepository } from '../legacy/blocksRepository.ts';
export const platformOptions: NonNullable<Parameters<typeof createPlatform>[1]> = {};
@Controller()
export class PlatformController {
  private readonly handler: ReturnType<typeof createApiHandler>;
  constructor(@Inject(PlatformStore) store: PlatformStore) {
    this.handler = createApiHandler(
      new JsonPageRepository(resolve('data/pages.json')),
      (
        process.env.CORS_ORIGINS ??
        'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174'
      ).split(','),
      new JsonBlockRepository(resolve('data/blocks.json')),
      createPlatform(store, platformOptions),
      process.env.ENABLE_LEGACY_API === '1',
    );
  }
  @All('{*path}') handle(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }
}
