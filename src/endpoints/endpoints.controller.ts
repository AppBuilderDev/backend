import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Req,
  Body,
  Inject,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { EndpointsService } from './endpoints.service.ts';
@Controller('api/v1/projects/:projectId/endpoints')
export class EndpointsController {
  constructor(@Inject(EndpointsService) private readonly endpoints: EndpointsService) {}
  @Get() list(@Param('projectId') p: string, @Req() req: Request) {
    this.endpoints.authorize(req, p);
    return this.endpoints.list(p);
  }
  @Post() create(@Param('projectId') p: string, @Req() req: Request, @Body() body: unknown) {
    return this.endpoints.save(p, this.endpoints.authorize(req, p, true), body);
  }
  @Put(':id') update(
    @Param('projectId') p: string,
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    return this.endpoints.save(p, this.endpoints.authorize(req, p, true), body, id);
  }
  @Delete(':id') @HttpCode(204) remove(
    @Param('projectId') p: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    this.endpoints.remove(p, this.endpoints.authorize(req, p, true), id);
  }
}
