import { Module } from '@nestjs/common';
import { EndpointsController } from './endpoints.controller.ts';
import { ResourcesController } from './resources.controller.ts';
import { EndpointsService } from './endpoints.service.ts';
@Module({ controllers: [EndpointsController, ResourcesController], providers: [EndpointsService] })
export class EndpointsModule {}
