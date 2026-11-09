# AppBuilderDev Backend

API NestJS independiente de Design y Runtime. Node 24 recomendado (minimo del proyecto 22.22.2). SQLite conserva cuentas, proyectos, paginas, entidades, servicios e inventario.

```powershell
npm ci --ignore-scripts
Copy-Item .env.example .env
npm run dev
```

El controlador SQLite 13 incluye binarios precompilados. `--ignore-scripts` evita que npm 10 intente compilarlo con node-gyp en Windows sin Visual Studio. Vite y SQLite se verificaron con los binarios distribuidos. No se requiere Nest CLI global.

API http://localhost:3001. Salud GET /health verifica SQLite. El archivo configurado en PLATFORM_DB se crea con todas las tablas al arrancar. Los datos locales migrados estan en data/platform.sqlite; el respaldo previo en data/platform-before-separation.sqlite. Ambos quedan fuera de Git. No se recrean cuentas ni se importan JSON como datos de una organizacion. Usar el mismo host en ambos frontends para compartir la cookie de sesion.

## Modulos

- database: proveedor SQLite compartido y transacciones existentes.
- endpoints: controladores y servicio Nest para catalogo HTTP y recursos CRUD.
- platform: adaptador Nest para la API existente de autenticacion, proyectos, inventario, servicios configurables, conexiones externas y publicaciones. Se conserva el motor de dominio probado en src/legacy/platform; no se ha reescrito ni eliminado su control de permisos.
- models: copia versionada de contratos; no importa archivos de los repositorios frontend.

El adaptador preserva los endpoints /api/v1 existentes. La API antigua /api/pages y /api/blocks esta deshabilitada salvo ENABLE_LEGACY_API=1 para las pruebas historicas locales.

## Crear un endpoint CRUD

1. Autenticarse con POST /api/v1/auth/register o /auth/login (cookie HttpOnly).
2. Crear el recurso con POST /api/v1/projects/:projectId/resources:

```json
{
  "name": "Productos",
  "key": "productos",
  "labelField": "nombre",
  "fields": [{ "key": "nombre", "label": "Nombre", "type": "text", "required": true }]
}
```

El backend expone inmediatamente:

| Metodo    | Ruta                                                           | Entrada                         |
| --------- | -------------------------------------------------------------- | ------------------------------- |
| GET       | /api/v1/projects/:projectId/resources/productos                | Lista {items,total,...}         |
| GET       | /api/v1/projects/:projectId/resources/productos/:id            | Un registro                     |
| POST      | /api/v1/projects/:projectId/resources/productos                | {"nombre":"Producto"}           |
| PUT/PATCH | /api/v1/projects/:projectId/resources/productos/:id            | {"nombre":"Nuevo","revision":1} |
| DELETE    | /api/v1/projects/:projectId/resources/productos/:id?revision=2 | Desactiva el registro           |

Las escrituras requieren X-Requested-With: AppBuilderDev y rol de editor o propietario. Revision evita sobrescribir cambios de otra sesion. DELETE desactiva; conserva historial. El recurso de inventario utiliza sus operaciones especializadas.

Tambien puedes implementar controladores Nest propios bajo /api/v1/projects/:projectId/... reutilizando EndpointsService.authorize y validacion. Registralos en AppModule antes del adaptador comodin PlatformModule. Agregar una ruta al catalogo no crea codigo fuente Nest; el generador de recursos crea endpoints por definicion de entidad.

## Catalogo de rutas

GET/POST /api/v1/projects/:projectId/endpoints, PUT/DELETE /endpoints/:id. Contrato: name, method, path con {projectId} y :id opcional, fields y itemsPath. La ruta debe pertenecer a la API del proyecto; no se aceptan URLs externas, traversal ni secretos. Las APIs externas de lectura conservan su flujo de conexiones y gateway seguro. Los endpoints de escritura externos/OAuth no forman parte de este cambio.

Publicar una RestTable valida metodos e IDs y captura los contratos. Editar una ruta no cambia publicaciones anteriores hasta republicar. Eliminar una ruta usada se rechaza con 409. Las definiciones usadas de entidades tambien quedan protegidas por las publicaciones.

## Configuracion

API_HOST=127.0.0.1, API_PORT=3001, PLATFORM_DB=./data/platform.sqlite, CORS_ORIGINS lista de origenes. .env es exclusivamente del backend y no se copia al navegador. CONNECTOR_MASTER_KEY y CONNECTOR_ALLOWED_HOSTS se administran aqui. `npm run connectors:setup -- dominio.example` conserva/genera la clave sin imprimirla. Un unico proceso de API; no multiples escritores de SQLite.

## Validar

```powershell
npm run build
npm run lint
npm test
npm run backup -- ./data/backups/manual.sqlite
```

Build emite dist/ y `npm start` lo ejecuta. Las pruebas usan SQLite temporal. Desde ../frontend_design, `npm run test:e2e` inicia este backend en 3101 con datos aislados y ambos frontends en 5183/5184. El proveedor externo simulado existe solo en tests/fixtures/api.ts.

## Swagger / OpenAPI

Abrir http://localhost:3001/docs/ (JSON: /docs-json, YAML: /docs-yaml). Contiene ejemplos de sesion, recursos CRUD, catalogo de rutas, entidades/servicios CRUD, paginas, Runtime e inventario. Los endpoints nativos de Nest se descubren automaticamente; el adaptador de dominio se documenta explicitamente para evitar publicar un falso endpoint comodin. Las operaciones avanzadas de servicios configurables, conexiones externas y equipo conservan sus guias funcionales en docs/.

Para probar sin copiar cookies: desplegar POST /api/v1/auth/register (si aun no tienes cuenta) o POST /api/v1/auth/login, pulsar Try it out, completar JSON y Execute. Swagger usa la cookie HttpOnly real y agrega X-Requested-With: AppBuilderDev. Copiar projects[0].id de la respuesta para projectId. Mantener el mismo host entre Swagger y Design (localhost o 127.0.0.1).

Despues probar POST /api/v1/projects/{projectId}/resources con el ejemplo Productos. Ese recurso habilita sus operaciones sin escribir un controlador. Usar key=productos en GET/POST /resources/{key} y el id de un registro en PUT/PATCH/DELETE /resources/{key}/{id}. Las actualizaciones y eliminaciones requieren la revision actual. El catalogo /endpoints solo registra rutas ya existentes para vincularlas a componentes de Design.

Los esquemas de entidades, campos y endpoints se derivan de las validaciones Zod; las validaciones de negocio se siguen aplicando en el servidor. Definir un recurso no genera archivos .ts ni permite ejecutar codigo libre. Para reglas especializadas, usar servicios configurables o un controlador Nest propio con sus DTO/decoradores Swagger.

Verificacion: tests/swagger.test.ts valida el documento, sus metodos, UI/JSON y sesiones/recursos con SQLite temporal. El recorrido e2e-platform/swagger.spec.ts de Design comprueba login y creacion desde la propia interfaz de Swagger.

### URLs de aplicaciones

Las paginas de un proyecto usan `/:appSlug/:pageCode`, por ejemplo `/test001/productos` o `/test001/reportes/ventas`. El backend asigna un slug global unico a cada proyecto a partir del nombre de la organizacion y conserva ese slug aunque cambie el nombre visible. Las coincidencias reciben sufijos (`test001-2`). La migracion de bases existentes es automatica y conserva los IDs y los datos.

Los enlaces antiguos `/p/:projectId/:pageCode` redirigen a la URL con slug, conservando query y fragmento. Las rutas cortas como `/productos` siguen resolviendo entre los proyectos accesibles; si hay varios resultados se solicita elegir la aplicacion. Cambiar la URL no concede permisos: se mantienen la sesion, el acceso al proyecto y la exigencia de publicar la pagina. Los IDs siguen usandose internamente en la API.
