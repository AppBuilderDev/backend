import type { OperationObject, ParameterObject, PathsObject } from '@nestjs/swagger';
import { ref, resourceExample, endpointExample } from './schemas.ts';
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
interface Options {
  body?: string;
  response?: string;
  status?: number;
  public?: boolean;
  example?: unknown;
  description?: string;
  query?: ParameterObject[];
}
export function documentedPaths(): PathsObject {
  const paths: PathsObject = {};
  const add = (
    path: string,
    method: Method,
    tag: string,
    summary: string,
    options: Options = {},
  ) => {
    const status = options.status ?? (method === 'post' ? 201 : method === 'delete' ? 204 : 200);
    const parameters: ParameterObject[] = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
      ...(match[1] === 'key' ? { example: 'productos' } : {}),
    }));
    if (method !== 'get')
      parameters.push({
        name: 'X-Requested-With',
        in: 'header',
        required: true,
        schema: { type: 'string', enum: ['AppBuilderDev'], default: 'AppBuilderDev' },
        description: 'Swagger la agrega automaticamente',
      });
    parameters.push(...(options.query ?? []));
    const errors: Record<number, string> = {
      400: 'Validacion',
      401: 'Inicia sesion',
      403: 'Permisos insuficientes',
      404: 'No encontrado',
      409: 'Conflicto de revision, duplicado o dependencia',
      429: 'Limite de intentos',
    };
    const operation: OperationObject = {
      tags: [tag],
      summary,
      description: options.description,
      operationId: method + '_' + path.replace(/[^a-zA-Z0-9]/g, '_'),
      security: options.public ? [] : [{ session: [] }],
      parameters,
      responses: {
        [status]: {
          description: status === 204 ? 'Operacion completada sin cuerpo' : 'Operacion completada',
          ...(status === 204
            ? {}
            : {
                content: {
                  'application/json': {
                    schema: options.response
                      ? ref(options.response)
                      : { type: 'object', additionalProperties: true },
                  },
                },
              }),
        },
        ...Object.fromEntries(
          Object.entries(errors).map(([code, description]) => [
            code,
            { description, content: { 'application/json': { schema: ref('Error') } } },
          ]),
        ),
      },
    };
    if (options.body)
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: ref(options.body),
            ...(options.example ? { example: options.example } : {}),
          },
        },
      };
    (paths[path] ??= {})[method] = operation;
  };
  const revision: ParameterObject = {
    name: 'revision',
    in: 'query',
    required: true,
    schema: { type: 'integer', minimum: 1 },
    example: 1,
  };
  const query = (name: string, type: 'string' | 'integer' = 'string'): ParameterObject => ({
    name,
    in: 'query',
    required: false,
    schema: { type },
  });
  const root = '/api/v1/projects/{projectId}';
  add('/health', 'get', 'Salud', 'Comprobar API y SQLite', { public: true });
  add('/api/v1/auth/register', 'post', 'Sesion', 'Crear cuenta y proyecto', {
    body: 'Register',
    response: 'Session',
    public: true,
    description:
      'Usa un correo propio. La respuesta establece cookie HttpOnly y devuelve projects[0].id.',
  });
  add('/api/v1/auth/login', 'post', 'Sesion', 'Iniciar sesion', {
    body: 'Login',
    response: 'Session',
    public: true,
    status: 200,
    description:
      'Ejecuta primero esta ruta. El navegador guardara la cookie HttpOnly para las siguientes peticiones.',
  });
  add('/api/v1/auth/session', 'get', 'Sesion', 'Consultar usuario y proyectos', {
    response: 'Session',
  });
  add('/api/v1/auth/logout', 'post', 'Sesion', 'Cerrar sesion', { status: 204 });
  add(root + '/resources', 'get', 'Recursos CRUD', 'Listar recursos creados');
  add(root + '/resources', 'post', 'Recursos CRUD', 'Crear recurso sin escribir un controlador', {
    body: 'EntityInput',
    example: resourceExample,
    description:
      'Define campos. Habilita inmediatamente GET/POST en /resources/{key} y GET/PUT/PATCH/DELETE en /resources/{key}/{id}. No genera archivos .ts. El primer labelField debe existir en fields.',
  });
  add(root + '/resources/{key}', 'get', 'Recursos CRUD', 'Listar registros', {
    response: 'ResourceList',
    query: [query('q'), query('page', 'integer'), query('pageSize', 'integer'), query('sort')],
    description:
      'key es el identificador que definiste al crear el recurso; por ejemplo productos.',
  });
  add(root + '/resources/{key}', 'post', 'Recursos CRUD', 'Crear registro', {
    body: 'ResourceCreate',
    response: 'ResourceRecord',
  });
  add(root + '/resources/{key}/{id}', 'get', 'Recursos CRUD', 'Consultar registro', {
    response: 'ResourceRecord',
  });
  add(root + '/resources/{key}/{id}', 'put', 'Recursos CRUD', 'Reemplazar valores del registro', {
    body: 'ResourceUpdate',
    response: 'ResourceRecord',
    description: 'Envia todos los campos del recurso y la revision actual.',
  });
  add(
    root + '/resources/{key}/{id}',
    'patch',
    'Recursos CRUD',
    'Actualizar algunos valores del registro',
    {
      body: 'ResourceUpdate',
      response: 'ResourceRecord',
      description: 'Conserva los campos omitidos; requiere revision actual.',
    },
  );
  add(root + '/resources/{key}/{id}', 'delete', 'Recursos CRUD', 'Desactivar registro', {
    query: [revision],
    description:
      'Eliminacion logica, conserva historial. Inventario tiene operaciones especializadas.',
  });
  add(root + '/endpoints', 'get', 'Catalogo de rutas', 'Listar rutas registradas');
  add(root + '/endpoints', 'post', 'Catalogo de rutas', 'Registrar una ruta que ya existe', {
    body: 'EndpointInput',
    response: 'Endpoint',
    example: endpointExample,
    description:
      'No crea el endpoint: registra su metodo, path y contrato para vincularlo en Design.',
  });
  add(root + '/endpoints/{id}', 'put', 'Catalogo de rutas', 'Editar ruta registrada', {
    body: 'EndpointUpdate',
    response: 'Endpoint',
  });
  add(root + '/endpoints/{id}', 'delete', 'Catalogo de rutas', 'Eliminar ruta no vinculada', {
    description: '409 si un borrador o publicacion usa esta ruta.',
  });
  add(root + '/entities', 'get', 'Entidades y servicios', 'Listar entidades');
  add(root + '/entities', 'post', 'Entidades y servicios', 'Crear entidad', {
    body: 'EntityInput',
    example: resourceExample,
  });
  add(root + '/entities/{id}', 'put', 'Entidades y servicios', 'Actualizar entidad', {
    body: 'EntityInput',
  });
  add(root + '/services', 'get', 'Entidades y servicios', 'Consultar contratos CRUD por entidad');
  add(
    root + '/services/{entityId}/records',
    'get',
    'Entidades y servicios',
    'Listar registros con formato values',
    { query: [query('q'), query('page', 'integer'), query('pageSize', 'integer')] },
  );
  add(
    root + '/services/{entityId}/records',
    'post',
    'Entidades y servicios',
    'Crear registro con formato values',
    { body: 'RecordWrite' },
  );
  add(
    root + '/services/{entityId}/records/{id}',
    'get',
    'Entidades y servicios',
    'Consultar registro con formato values',
  );
  add(
    root + '/services/{entityId}/records/{id}',
    'put',
    'Entidades y servicios',
    'Actualizar registro con formato values',
    { body: 'RecordWrite' },
  );
  add(
    root + '/services/{entityId}/records/{id}',
    'delete',
    'Entidades y servicios',
    'Desactivar registro de entidad',
    { query: [revision] },
  );
  add(root + '/pages', 'get', 'Paginas', 'Listar borradores');
  add(root + '/pages', 'post', 'Paginas', 'Crear pagina o publicar', { body: 'PageInput' });
  add(root + '/pages/{id}', 'get', 'Paginas', 'Consultar borrador');
  add(root + '/pages/{id}', 'put', 'Paginas', 'Guardar o publicar pagina', {
    body: 'PageInput',
    description: 'status=published publica solo con rol owner. Requiere revision actual.',
  });
  add(root + '/pages/{id}', 'delete', 'Paginas', 'Eliminar pagina', { query: [revision] });
  add(
    '/api/v1/runtime/projects/{projectId}/pages/by-path',
    'get',
    'Runtime',
    'Resolver pagina publicada',
    {
      query: [
        {
          name: 'path',
          in: 'query',
          required: true,
          schema: { type: 'string' },
          example: '/inicio',
        },
      ],
    },
  );
  add(
    '/api/v1/runtime/projects/{projectId}/navigation',
    'get',
    'Runtime',
    'Consultar navegacion publicada',
  );
  add(root + '/templates/inventory', 'post', 'Inventario', 'Crear plantilla inicial de inventario');
  add(root + '/inventory/config', 'get', 'Inventario', 'Consultar configuracion');
  add(root + '/inventory/config', 'post', 'Inventario', 'Configurar inventario', {
    body: 'InventoryConfig',
  });
  for (const [path, summary] of [
    ['access', 'Consultar permiso operativo'],
    ['stock', 'Consultar existencias'],
    ['movements', 'Consultar movimientos'],
    ['operations', 'Consultar operaciones disponibles'],
    ['actors', 'Consultar actores'],
  ])
    add(root + '/inventory/' + path, 'get', 'Inventario', summary);
  add(root + '/inventory/movements', 'post', 'Inventario', 'Registrar entrada, salida o ajuste', {
    body: 'Movement',
    description:
      'operationId UUID permite reintentos idempotentes; permisos operativos independientes.',
  });
  return paths;
}
