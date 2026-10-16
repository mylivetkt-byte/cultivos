**AGENTS.md** – Compact guidance for OpenCode sessions  

- **Start the full stack**  
  ```bash
  npm run dev          # runs both server (npm run dev:server) and client (npm run dev:client) concurrently
  ```  
  *Server* listens on **PORT 3002** (fallback to env `PORT`).  
  *Client* runs Vite on **http://localhost:5173** and proxies `/api/*` to the server.

- **Build / preview the client**  
  ```bash
  npm run build        # Vite production build → dist/
  npm run preview      # locally serve the built client (default port 4173)
  ```

- **Server entry‑point** – `server/index.js` registers every API router under `/api/*`.  
  Key routes you’ll hit often:  

  | Path prefix                     | Router file                               |
  |--------------------------------|-------------------------------------------|
  | `/api/basculas`                | `routes/basculas.js`                      |
  | `/api/tables`                  | `routes/tables.js`                        |
  | `/api/table` (CRUD)            | `routes/crud.js`                          |
  | `/api/gis`                     | `routes/gis.js`                           |
  | `/api/dashboard/*`             | custom stats endpoints (see lines 95‑200) |
  | `/api/contabilidad`, `/api/parametros`, … | many domain‑specific routers (see imports lines 30‑44) |

- **Database** – `server/db.js` creates a MySQL pool (`pool`). All routes use this pool; ensure a reachable MySQL instance and set the usual `MYSQL_…` environment variables before starting the server.

- **Vite proxy** (client‑side) – defined in `vite.config.js`:  
  ```js
  proxy: { '/api': { target: 'http://localhost:3002', changeOrigin: true } }
  ```
  This means you can call API endpoints directly from the browser without CORS issues.

- **Concurrent dev workflow** – `concurrently` runs the two processes; if you need only one side, you can invoke the underlying scripts directly:  
  ```bash
  npm run dev:server   # start only the Express API
  npm run dev:client   # start only Vite dev server
  ```

- **Node module type** – `package.json` sets `"type": "module"`; all source files are ES modules (`import … from …`). Use `import` instead of `require`.

- **No test scripts** – the repository currently has no npm `test` command. If you add tests, create a script (e.g., `"test": "vitest"` or `"test": "mocha"`). Until then, rely on manual API calls (Postman, curl, or the client UI).

- **WhatsApp bot runs in a SEPARATE process** – `server/whatsapp-bot.js` owns the Baileys socket and exposes a local mini‑API on `WHATSAPP_BOT_PORT` (default `3004`, bound to `127.0.0.1`). The main API talks to it over HTTP via `WHATSAPP_BOT_URL`. `server/services/whatsappService.js` is a thin HTTP client that keeps the old function signatures (`getStatus`, `sendTextMessage`, `sendDocumentMessage`, `sendPdfReport`, `logoutWhatsApp`), so existing routers still work. The real socket logic lives in `server/services/whatsappBotCore.js`. If the bot is not running, `/api/whatsapp/*` returns `503`.

- **Secrets live in `.env`** – copy `.env.example` → `.env` and fill real values. `JWT_SECRET` is required in production (the server refuses to start without it; dev has an insecure fallback with a warning). `.env` and `auth_info_baileys/` are gitignored.
- **Important package quirks**
  - The server parses JSON payloads up to **50 MB** (`express.json({ limit: '50mb' })`).  
  - File uploads should therefore respect this limit.  
  - All routes are mounted before the duplicate `app.use('/api/whatsapp', …)` on line 77 – already fixed: the duplicate `/api/basculas` was removed from `server/index.js` (Paso 3).

- **Typical workflow for a new feature**  
  1. Add/modify a router file under `server/routes/`.  
  2. Import it in `server/index.js` and register the path.  
  3. Update any client calls (React components in `src/`) to hit the new endpoint.  
  4. Run `npm run dev` and verify both server logs and client UI.

- **Local development tips**  
  - Keep the server running (`npm run dev:server`) while iterating on API logic; Vite hot‑reload will pick up frontend changes instantly.  
  - If the MySQL connection fails, check that the environment variables (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`) match the local database.

- **Reference files** (quick look‑up)  
  - `package.json` — scripts & module type.  
  - `vite.config.js` — dev server port & API proxy.  
  - `server/index.js` — router wiring and server port.  

*Only the above points are likely to be missed by an agent without explicit guidance.*

**Reglas visuales de unicidad**
- **Cliente**: `codigoCliente`, `cif`/`rfc` deben ser únicos a nivel global.  API debe devolver 409 si se intenta crear/actualizar con un valor existente; la UI debe validar al perder foco y bloquear el botón Guardar.
- **Finca**: `codigoFinca` y `nombre` únicos por cliente (`UNIQUE(id_cliente, codigoFinca)` y `UNIQUE(id_cliente, nombre)`).  Validación similar en el endpoint `/api/fincas` y en los formularios de finca.
- **Núcleo**: `codigoNucleo` y `nombre` únicos por finca (`UNIQUE(id_finca, codigoNucleo)` y `UNIQUE(id_finca, nombre)`).  Validar en `/api/nucleos` y en la UI correspondiente.
- **Implementación mínima**: agregar índices `UNIQUE` en los scripts de creación/modificación de tablas y añadir una consulta `SELECT` previa al `INSERT/UPDATE` en los routers; mostrar error 409 y mensaje visual en el cliente.

- **Regla de Buscadores en CRUDs**: En cada formulario o CRUD donde el usuario deba seleccionar un �tem (herramienta, producto, insumo), se debe utilizar siempre un buscador (AutoComplete o Select con showSearch) por c�digo o nombre, evitando inputs de texto simple para descripciones de �tems.
