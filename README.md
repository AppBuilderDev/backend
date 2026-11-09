# AppBuilderDev Backend

Backend NestJS independiente de Design y Runtime. Conserva la API de autenticacion, proyectos, paginas, entidades, inventario, operaciones y conexiones externas.

Usar Node 24. Instalar con `npm ci --ignore-scripts`, copiar `.env.example` a `.env` y ejecutar `npm run dev`. La API escucha en http://localhost:3001 y GET /health comprueba SQLite.

PLATFORM_DB configura el archivo SQLite (por defecto data/platform.sqlite). Los datos, respaldos y .env se excluyen de Git. El controlador SQLite incluye binarios precompilados; --ignore-scripts evita la compilacion nativa con npm 10 en Windows.

La logica de dominio migrada vive en src/legacy/platform y se integra mediante PlatformModule. DatabaseModule proporciona la base transaccional. No existen imports a los repositorios frontend.

Verificar con `npm run build`, `npm run lint` y `npm test`. Las pruebas usan bases temporales. `npm run backup` crea una copia verificada. El lanzador tests/fixtures/api.ts se usa exclusivamente para pruebas de navegador y no se importa en produccion.
