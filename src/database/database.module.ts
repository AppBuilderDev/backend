import { HealthController } from './health.controller.ts';
import { Global, Module } from '@nestjs/common';
import { resolve } from 'node:path';
import { PlatformStore } from '../legacy/platform/store.ts';
@Global()
@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: PlatformStore,
      useFactory: () =>
        new PlatformStore(resolve(process.env.PLATFORM_DB ?? 'data/platform.sqlite')),
    },
  ],
  exports: [PlatformStore],
})
export class DatabaseModule {}
