import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ApiErrorFilter } from '../src/common/api-error.filter';
import { PlatformStore } from '../src/legacy/platform/store';
import type { INestApplication } from '@nestjs/common';
let app: INestApplication | undefined;
let dir = '';
afterEach(async () => {
  if (app) {
    const store = app.get(PlatformStore);
    await app.close();
    if (store.db.open) store.close();
  }
  if (dir) await rm(dir, { recursive: true, force: true });
});
it('Nest crea recursos, registra rutas CRUD, publica contratos y preserva datos', async () => {
  dir = await mkdtemp(join(tmpdir(), 'builder-nest-'));
  process.env.PLATFORM_DB = join(dir, 'db.sqlite');
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new ApiErrorFilter());
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  let cookie = '';
  const call = async (path: string, method = 'GET', data?: unknown) => {
    const r = await fetch(base + '/api/v1' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'AppBuilderDev',
        Cookie: cookie,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    cookie = r.headers.get('set-cookie')?.split(';')[0] ?? cookie;
    return r;
  };
  const sessionResponse = await call('/auth/register', 'POST', {
    name: 'Owner',
    organization: 'Test',
    email: 'nest@example.test',
    password: 'Password-test-1234',
  });
  expect(sessionResponse.status).toBe(201);
  const session = await sessionResponse.json();
  const p = session.projects[0].id,
    root = '/projects/' + p;
  const field = { key: 'nombre', label: 'Nombre', type: 'text', required: true };
  expect(
    (
      await call(root + '/resources', 'POST', {
        name: 'Productos',
        key: 'productos',
        labelField: 'nombre',
        fields: [field],
      })
    ).status,
  ).toBe(201);
  const endpoints = [];
  for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
    const r = await call(root + '/endpoints', 'POST', {
      name: method,
      method,
      path:
        '/api/v1/projects/{projectId}/resources/productos' +
        (['PUT', 'DELETE'].includes(method) ? '/:id' : ''),
      fields: [field],
    });
    expect(r.status).toBe(201);
    endpoints.push(await r.json());
  }
  expect((await (await call(root + '/endpoints')).json()).length).toBe(4);
  expect(
    (
      await call(root + '/endpoints', 'POST', {
        name: 'Duplicate',
        method: 'GET',
        path: endpoints[0].path,
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await call(root + '/endpoints', 'POST', {
        name: 'External',
        method: 'GET',
        path: 'http://evil.test',
      })
    ).status,
  ).toBe(400);
  const create = await call(root + '/resources/productos', 'POST', { nombre: 'Inicial' });
  expect(create.status).toBe(201);
  const row = await create.json();
  expect(row.nombre).toBe('Inicial');
  const update = await call(root + '/resources/productos/' + row.id, 'PUT', {
    nombre: 'Actualizado',
    revision: row.revision,
  });
  expect(update.status).toBe(200);
  const updated = await update.json();
  expect(
    (
      await call(root + '/resources/productos/' + row.id, 'PUT', {
        nombre: 'Obsoleto',
        revision: 1,
      })
    ).status,
  ).toBe(409);
  const components = [
    {
      id: 'table',
      type: 'RestTable',
      props: {
        listEndpointId: endpoints[0].id,
        createEndpointId: endpoints[1].id,
        updateEndpointId: endpoints[2].id,
        deleteEndpointId: endpoints[3].id,
      },
    },
  ];
  const saved = await call(root + '/pages', 'POST', {
    name: 'Tabla',
    code: 'tabla',
    status: 'published',
    components,
  });
  expect(saved.status).toBe(201);
  const published = await call('/runtime' + root + '/pages/by-path?path=/tabla');
  expect(published.status).toBe(200);
  expect((await published.json()).endpoints.length).toBe(4);
  expect((await call(root + '/endpoints/' + endpoints[0].id, 'DELETE')).status).toBe(409);
  expect(
    (
      await call(
        root + '/resources/productos/' + row.id + '?revision=' + updated.revision,
        'DELETE',
      )
    ).status,
  ).toBe(204);
  expect((await (await call(root + '/resources/productos')).json()).items).toEqual([]);
  const changed = await call(root + '/endpoints/' + endpoints[0].id, 'PUT', {
    ...endpoints[0],
    name: 'GET modificado',
  });
  expect(changed.status).toBe(200);
  expect((await call(root + '/endpoints/' + endpoints[0].id, 'PUT', endpoints[0])).status).toBe(
    409,
  );
  const snapshot = await (await call('/runtime' + root + '/pages/by-path?path=/tabla')).json();
  expect(snapshot.endpoints.find((e: { id: string }) => e.id === endpoints[0].id).name).toBe('GET');
  const unusedResponse = await call(root + '/endpoints', 'POST', {
    name: 'Individual',
    method: 'GET',
    path: '/api/v1/projects/{projectId}/resources/productos/:id',
    fields: [field],
  });
  expect(unusedResponse.status).toBe(201);
  const unused = await unusedResponse.json();
  expect((await call(root + '/endpoints/' + unused.id, 'DELETE')).status).toBe(204);
  const outsider = await fetch(base + '/api/v1' + root + '/endpoints');
  expect(outsider.status).toBe(401);
});
