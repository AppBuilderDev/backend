import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.ts';
import { PlatformModule } from './platform/platform.module.ts';
import { EndpointsModule } from './endpoints/endpoints.module.ts';
@Module({ imports: [DatabaseModule, EndpointsModule, PlatformModule] })
export class AppModule {}
