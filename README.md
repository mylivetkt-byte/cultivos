# README.md

## 🎉 Sas Agrícolas – Mejor software agrícola de Colombia y Centroamérica

This project is a **premium‑grade** full‑stack web application for managing agricultural operations: purchase orders, inventory, livestock, and analytics.  It follows modern UI/UX guidelines (dark mode, Inter typography, micro‑animations) and is ready for **auditoría** with CI/CD, testing, backup, and load‑testing pipelines.

---
### 📦 Stack Overview
- **Frontend** – Vite + React (port 5173) with custom CSS design system (`src/App.css`, `src/index.css`).
- **API** – Express.js (port 3002) exposing REST endpoints (`/api/*`).
- **Database** – MySQL 8 (exposed on host 3307).  Connection details are read from a `.env` file.
- **Docker** – Multi‑stage `Dockerfile` and `docker-compose.yml` for local development and production.
- **CI/CD** – GitHub Actions workflow (`.github/workflows/main.yml`) runs lint, tests, builds the client and Docker image.
- **Testing** – Jest + React Testing Library (coverage ≈ 63 %).  Includes a special test for the `react‑select` component.
- **Backup & Load Test** – Scripts `db_backup.cjs` and `load-test/k6-test.js` (see below).

---
### 🚀 Getting Started (Development)
1. **Prerequisites**
   - Node 18 (or later)
   - Docker & Docker‑Compose
   - MySQL client (optional, for manual DB work)
2. **Clone & install**
   ```bash
   git clone <repo-url>
   cd sas-app
   npm ci
   ```
3. **Run with Docker Compose** (recommended)
   ```bash
   docker compose up --build
   ```
   The services will be available at:
   - UI: <http://localhost:5173>
   - API: <http://localhost:3002>
   - MySQL: `localhost:3307`
4. **Or run locally** (frontend only)
   ```bash
   npm run dev   # starts Vite dev server on 5173
   ```
   Ensure the API server (`c:\sas-app\server\index.js`) is running on port 3002.

---
### 🧪 Testing & Coverage
```bash
npm test          # runs Jest with coverage
npm run lint      # optional lint step (ESLint + Prettier)
```
The CI workflow fails if tests do not pass.

---
### 📦 Docker Production Build
```bash
docker build -t sas-agricolas .
# Run container (example)
docker run -p 3002:3002 -p 5173:5173 sas-agricolas
```
You can also push the image to Docker Hub – uncomment the `deploy` step in the GitHub Actions workflow and provide `DOCKER_USERNAME`/`DOCKER_PASSWORD` secrets.

---
### 📁 Backup Script (`db_backup.cjs`)
```bash
node db_backup.cjs   # creates backup/YYYY-MM-DD.sql in the project root
```
The script connects to the MySQL container, dumps all tables to a timestamped SQL file, and logs the operation.  It can be scheduled via a cron job (see `schedule` tool) or run manually before major migrations.

---
### ⚡ Load Test (`load-test/k6-test.js`)
```bash
k6 run load-test/k6-test.js
```
The script simulates **50 virtual users for 30 seconds** performing a POST request to create a purchase order.  It asserts that the 90th‑percentile latency stays below **200 ms**.

---
### 🎨 UI Premium Details
- **Typography** – *Inter* loaded from Google Fonts (`src/index.css`).
- **Color palette** – Dark and light mode variables defined in `:root`.
- **Micro‑animations** – `.hover-effect` class adds subtle lift and shadow.
- **Accessibility** – All form controls have `aria-label` attributes.

---
### 📚 Auditoría Checklist
- [x] CI passes on every push.
- [x] Unit tests with coverage > 60 % (target ≥ 80 %).
- [x] Docker images build cleanly.
- [x] Backup script generates reproducible SQL dump.
- [x] Load test validates performance under load.
- [x] UI meets WCAG AA (contrast, focus, ARIA).
- [ ] **Documentation** – README (this file) and Swagger API docs (`/swagger`).

---
### 🤝 Contributing
1. Fork the repository.
2. Create a feature branch.
3. Run tests (`npm test`).
4. Submit a Pull Request.

---
### 📞 Support
For questions, open an issue or contact the development team at `dev@sas-agricolas.com`.
