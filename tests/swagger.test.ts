import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PlatformStore } from '../src/legacy/platform/store';
import { ApiErrorFilter } from '../src/common/api-error.filter';
import { setupSwagger, createOpenApiDocument } from '../src/openapi/setup';
let app: INestApplication | undefined,
  dir = '';
afterEach(async () => {
  if (app) {
    const store = app.get(PlatformStore);
    await app.close();
    if (store.db.open) store.close();
  }
  if (dir) await rm(dir, { recursive: true, force: true });
});
it('documenta metodos reales sin exponer el comodin del adaptador', () => {
  const doc = createOpenApiDocument();
  expect(doc.paths['/api/v1/projects/{projectId}/resources/{key}'].post?.requestBody).toBeDefined();
  expect(Object.keys(doc.paths['/api/v1/projects/{projectId}/resources/{key}'])).toEqual([
    'get',
    'post',
  ]);
  expect(Object.keys(doc.paths['/api/v1/projects/{projectId}/resources/{key}/{id}'])).toEqual([
    'get',
    'put',
    'patch',
    'delete',
  ]);
  expect(doc.paths['/{*path}']).toBeUndefined();
  expect(doc.components?.securitySchemes?.session).toMatchObject({
    in: 'cookie',
    name: 'ab_session',
  });
  const ids = Object.values(doc.paths).flatMap((path) =>
    Object.values(path)
      .filter((op) => typeof op === 'object' && op !== null && 'operationId' in op)
      .map((op) => op.operationId),
  );
  expect(new Set(ids).size).toBe(ids.length);
});
it('sirve UI, JSON y login utilizable con cookie y recursos reales', async () => {
  dir = await mkdtemp(join(tmpdir(), 'builder-swagger-'));
  process.env.PLATFORM_DB = join(dir, 'db.sqlite');
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new ApiErrorFilter());
  setupSwagger(app);
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const html = await fetch(base + '/docs/');
  expect(html.status).toBe(200);
  expect(await html.text()).toContain('swagger-ui');
  const init = await (await fetch(base + '/docs/swagger-ui-init.js')).text();
  expect(init).toContain('X-Requested-With');
  expect(init).toContain('credentials');
  const specification = await (await fetch(base + '/docs-json')).json();
  expect(specification.info.title).toBe('AppBuilderDev API');
  expect(Object.keys(specification.paths).some((path) => path.includes('*'))).toBe(false);
  const registered = await fetch(base + '/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'AppBuilderDev',
      Origin: base,
    },
    body: JSON.stringify({
      name: 'Swagger',
      email: 'swagger@example.test',
      password: 'Swagger-test-1234',
      organization: 'Demo',
    }),
  });
  expect(registered.status).toBe(201);
  const cookie = registered.headers.get('set-cookie')!.split(';')[0];
  const session = await registered.json();
  const project = session.projects[0].id;
  const schema = specification.components.schemas.EntityInput;
  expect(schema.properties.fields).toBeDefined();
  const resource = await fetch(base + '/api/v1/projects/' + project + '/resources', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'AppBuilderDev',
      Origin: base,
      Cookie: cookie,
    },
    body: JSON.stringify({
      name: 'Productos',
      key: 'productos',
      labelField: 'nombre',
      fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }],
    }),
  });
  expect(resource.status).toBe(201);
  const list = await fetch(base + '/api/v1/projects/' + project + '/resources/productos', {
    headers: { Cookie: cookie },
  });
  expect(list.status).toBe(200);
  expect((await list.json()).items).toEqual([]);
});
