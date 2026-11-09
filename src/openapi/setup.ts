import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { schemas } from './schemas.ts';
import { documentedPaths } from './paths.ts';
export function createOpenApiDocument(app?: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('AppBuilderDev API')
    .setVersion('0.2.0')
    .setDescription(
      'Flujo: 1) crear cuenta o iniciar sesion; 2) copiar projectId de la sesion; 3) crear recurso; 4) registrar rutas en Design; 5) vincular Tabla HTTP y publicar. Recursos CRUD son endpoints habilitados por metadatos, no archivos de codigo generados. La API requiere cookie HttpOnly y permisos. Swagger agrega X-Requested-With en las escrituras. Se documentan el flujo builder, sesion, paginas, Runtime, entidades e inventario; servicios configurables, conexiones externas y equipo mantienen su documentacion funcional en docs/.',
    )
    .addCookieAuth('ab_session', { type: 'apiKey', in: 'cookie' }, 'session')
    .addServer('/')
    .build();
  const automatic = app
    ? SwaggerModule.createDocument(app, config)
    : { ...config, openapi: '3.0.0', paths: {} };
  return {
    ...automatic,
    openapi: '3.0.0',
    paths: { ...automatic.paths, ...documentedPaths() },
    components: {
      ...automatic.components,
      schemas: { ...automatic.components?.schemas, ...schemas },
    },
  };
}
export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup('docs', app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: 'docs-json',
    yamlDocumentUrl: 'docs-yaml',
    customSiteTitle: 'AppBuilderDev Swagger',
    swaggerOptions: {
      withCredentials: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: -1,
      requestInterceptor: (request: { headers: Record<string, string>; credentials?: string }) => {
        request.headers['X-Requested-With'] = 'AppBuilderDev';
        request.credentials = 'include';
        return request;
      },
    },
  });
}
