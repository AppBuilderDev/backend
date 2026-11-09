import { Inject, Injectable } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { randomUUID } from 'node:crypto';
import { PlatformStore, fail } from '../legacy/platform/store.ts';
import { PlatformAuth } from '../legacy/platform/auth.ts';
import { endpointInputSchema, type Endpoint } from '../models/endpoints.ts';
@Injectable()
export class EndpointsService {
  constructor(@Inject(PlatformStore) readonly store: PlatformStore) {}
  authorize(req: IncomingMessage, projectId: string, write = false) {
    if (write && req.headers['x-requested-with'] !== 'AppBuilderDev')
      fail(403, 'Falta cabecera de proteccion');
    const user = new PlatformAuth(this.store).user(req);
    this.store.access(projectId, user, write);
    return user;
  }
  list(projectId: string): Endpoint[] {
    return (
      this.store.db
        .prepare('SELECT definition FROM endpoint_routes WHERE project_id=? ORDER BY name')
        .all(projectId) as { definition: string }[]
    ).map((r) => JSON.parse(r.definition));
  }
  save(projectId: string, userId: string, input: unknown, id?: string) {
    const data = endpointInputSchema.parse(input);
    const old = id ? this.list(projectId).find((e) => e.id === id) : undefined;
    if (id && !old) fail(404, 'Ruta no encontrada');
    if (old && (input as { revision?: number }).revision !== old.revision)
      fail(409, 'La ruta cambio; recarga antes de guardar');
    if (
      this.list(projectId).some(
        (e) => e.id !== id && e.method === data.method && e.path === data.path,
      )
    )
      fail(409, 'Metodo y ruta ya registrados');
    const now = new Date().toISOString();
    const row: Endpoint = {
      ...data,
      id: old?.id ?? randomUUID(),
      projectId,
      revision: (old?.revision ?? 0) + 1,
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
    };
    this.store.db
      .prepare(
        'INSERT INTO endpoint_routes(id,project_id,name,definition) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,definition=excluded.definition',
      )
      .run(row.id, projectId, row.name, JSON.stringify(row));
    this.store.audit(projectId, userId, 'endpoint.save', row.id);
    return row;
  }
  remove(projectId: string, userId: string, id: string) {
    const routes = this.list(projectId);
    if (!routes.some((e) => e.id === id)) fail(404, 'Ruta no encontrada');
    const pages = this.store.db
      .prepare('SELECT draft,published FROM pages WHERE project_id=?')
      .all(projectId) as { draft: string; published: string | null }[];
    if (
      pages.some((p) =>
        [p.draft, p.published]
          .filter(Boolean)
          .some((p) => JSON.stringify(JSON.parse(p!).components).includes(JSON.stringify(id))),
      )
    )
      fail(409, 'La ruta esta vinculada a una pagina; desvinculala antes de eliminar');
    this.store.db
      .prepare('DELETE FROM endpoint_routes WHERE project_id=? AND id=?')
      .run(projectId, id);
    this.store.audit(projectId, userId, 'endpoint.delete', id);
  }
}
