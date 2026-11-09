import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Controller, Get, Post, All, Param, Req, Body, Res, Inject } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { EndpointsService } from './endpoints.service.ts';
import { fail } from '../legacy/platform/store.ts';
import type { DataRecord } from '../models/data.ts';
const flatten = (r: DataRecord) => ({ ...r.values, id: r.id, revision: r.revision });
@Controller('api/v1/projects/:projectId/resources')
export class ResourcesController {
  constructor(@Inject(EndpointsService) private readonly endpoints: EndpointsService) {}
  @Get() list(@Param('projectId') p: string, @Req() req: Request) {
    this.endpoints.authorize(req, p);
    return this.endpoints.store
      .entities(p)
      .map((e) => ({ ...e, path: `/api/v1/projects/{projectId}/resources/${e.key}` }));
  }
  @Post() create(@Param('projectId') p: string, @Req() req: Request, @Body() body: unknown) {
    const user = this.endpoints.authorize(req, p, true);
    return this.endpoints.store.saveEntity(p, body, user);
  }
  @ApiExcludeEndpoint()
  @All([':key', ':key/:id'])
  records(
    @Param('projectId') p: string,
    @Param('key') key: string,
    @Param('id') id: string | undefined,
    @Req() req: Request,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const user = this.endpoints.authorize(req, p, !['GET', 'HEAD'].includes(req.method)),
      store = this.endpoints.store;
    const entity =
      store.entities(p).find((e) => e.key === key) ?? fail(404, 'Recurso no encontrado');
    const params = new URL(req.originalUrl, 'http://localhost').searchParams;
    if (req.method === 'GET') {
      if (id) return res.json(flatten(store.getRecord(p, entity.id, id)));
      const result = store.listRecords(p, entity.id, params);
      return res.json({ ...result, items: result.items.map(flatten) });
    }
    if (req.method === 'POST' && !id) {
      const values = z.record(z.string(), z.unknown()).parse(body);
      return res.status(201).json(flatten(store.saveRecord(p, entity.id, { values }, user)));
    }
    if (['PUT', 'PATCH'].includes(req.method) && id) {
      const { revision, ...values } = z.record(z.string(), z.unknown()).parse(body);
      const previous = store.getRecord(p, entity.id, id);
      return res.json(
        flatten(
          store.saveRecord(
            p,
            entity.id,
            {
              revision,
              values: req.method === 'PATCH' ? { ...previous.values, ...values } : values,
            },
            user,
            id,
          ),
        ),
      );
    }
    if (req.method === 'DELETE' && id) {
      const inventory = store.db
        .prepare('SELECT entity_id FROM inventory_config WHERE project_id=?')
        .get(p) as { entity_id: string } | undefined;
      if (inventory?.entity_id === entity.id)
        fail(409, 'Usa las operaciones de inventario para este recurso');
      const revision = z.coerce.number().int().positive().parse(params.get('revision'));
      store.deactivateRecord(p, entity.id, id, revision, user);
      return res.status(204).end();
    }
    fail(405, 'Metodo no disponible');
  }
}
