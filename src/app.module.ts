import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.ts';
import { PlatformModule } from './platform/platform.module.ts';
@Module({ imports: [DatabaseModule, PlatformModule] })
export class AppModule {}
