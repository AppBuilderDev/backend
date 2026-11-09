import { PlatformStore } from '../../src/legacy/platform/store.ts';
import type { Request, Response, NextFunction } from 'express';
process.env.APPBUILDER_TEST_IMPORT = '1';
import type { GatewayTransport } from '../../src/legacy/platform/externalGateway.ts';
const transport: GatewayTransport = async (url, headers) => {
  let authorized = false;
  let name = '';
  if (url.hostname === 'catalog.example.test' && url.pathname === '/test/catalog') {
    authorized = headers['X-API-Key'] === 'e2e-test-credential';
    name = 'Producto de prueba';
  } else if (url.hostname === 'catalog.example.test' && url.pathname === '/production/catalog') {
    authorized = headers.Authorization === 'Bearer e2e-prod-credential';
    name = 'Producto de producción';
  } else if (url.hostname === 'catalog.example.test' && url.pathname === '/production/rotated') {
    authorized = headers.Authorization === 'Bearer e2e-rotated-credential';
    name = 'Producto actualizado';
  }
  if (!authorized)
    return {
      status: 401,
      contentType: 'application/json',
      body: Buffer.from('{"error":"not authorized"}'),
    };
  const query = url.searchParams.get('q');
  return {
    status: query === 'redirect' ? 302 : 200,
    contentType: 'application/json',
    body: Buffer.from(
      JSON.stringify({
        items:
          query === 'empty'
            ? []
            : [
                {
                  nombre: query === 'echo' ? (headers.Authorization ?? headers['X-API-Key']) : name,
                  precio: query === 'incompatible' ? 12.5 : 1990,
                  internal: 'not-public',
                },
              ],
      }),
    ),
  };
};

const { bootstrap } = await import('../../src/main.ts');
await bootstrap(
  {
    connections: {
      masterKey: Buffer.alloc(32, 7).toString('base64'),
      allowedHosts: ['catalog.example.test'],
      resolve: async () => [{ address: '1.1.1.1', family: 4 }],
      transport,
    },
  },
  (app) => {
    const store = app.get(PlatformStore);
    // Browser scenarios use separate accounts but share a fixture process/IP. Do not share their signup quota.
    // This middleware is never imported by production; domain tests exercise the actual throttle.
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.method === 'POST' && req.url === '/api/v1/auth/register')
        store.db.prepare("DELETE FROM login_attempts WHERE key LIKE 'register:%'").run();
      next();
    });
  },
);
