# AppBuilderDev Backend

Backend NestJS independiente de Design y Runtime. Conserva la API de autenticacion, proyectos, paginas, entidades, inventario, operaciones y conexiones externas.

Usar Node 24. Instalar con `npm ci --ignore-scripts`, copiar `.env.example` a `.env` y ejecutar `npm run dev`. La API escucha en http://localhost:3001 y GET /health comprueba SQLite.

PLATFORM_DB configura el archivo SQLite (por defecto data/platform.sqlite). Los datos, respaldos y .env se excluyen de Git. El controlador SQLite incluye binarios precompilados; --ignore-scripts evita la compilacion nativa con npm 10 en Windows.

La logica de dominio migrada vive en src/legacy/platform y se integra mediante PlatformModule. DatabaseModule proporciona la base transaccional. No existen imports a los repositorios frontend.

Verificar con `npm run build`, `npm run lint` y `npm test`. Las pruebas usan bases temporales. `npm run backup` crea una copia verificada. El lanzador tests/fixtures/api.ts se usa exclusivamente para pruebas de navegador y no se importa en produccion.

## Swagger / OpenAPI

Abrir http://localhost:3001/docs/ (JSON: /docs-json, YAML: /docs-yaml). Contiene ejemplos de sesion, recursos CRUD, catalogo de rutas, entidades/servicios CRUD, paginas, Runtime e inventario. Los endpoints nativos de Nest se descubren automaticamente; el adaptador de dominio se documenta explicitamente para evitar publicar un falso endpoint comodin. Las operaciones avanzadas de servicios configurables, conexiones externas y equipo conservan sus guias funcionales en docs/.

Para probar sin copiar cookies: desplegar POST /api/v1/auth/register (si aun no tienes cuenta) o POST /api/v1/auth/login, pulsar Try it out, completar JSON y Execute. Swagger usa la cookie HttpOnly real y agrega X-Requested-With: AppBuilderDev. Copiar projects[0].id de la respuesta para projectId. Mantener el mismo host entre Swagger y Design (localhost o 127.0.0.1).

Despues probar POST /api/v1/projects/{projectId}/resources con el ejemplo Productos. Ese recurso habilita sus operaciones sin escribir un controlador. Usar key=productos en GET/POST /resources/{key} y el id de un registro en PUT/PATCH/DELETE /resources/{key}/{id}. Las actualizaciones y eliminaciones requieren la revision actual. El catalogo /endpoints solo registra rutas ya existentes para vincularlas a componentes de Design.

Los esquemas de entidades, campos y endpoints se derivan de las validaciones Zod; las validaciones de negocio se siguen aplicando en el servidor. Definir un recurso no genera archivos .ts ni permite ejecutar codigo libre. Para reglas especializadas, usar servicios configurables o un controlador Nest propio con sus DTO/decoradores Swagger.

Verificacion: tests/swagger.test.ts valida el documento, sus metodos, UI/JSON y sesiones/recursos con SQLite temporal. El recorrido e2e-platform/swagger.spec.ts de Design comprueba login y creacion desde la propia interfaz de Swagger.
