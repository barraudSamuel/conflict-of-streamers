## Docker Deployment Guide

This repository now ships with a Docker-based workflow that you can use both to validate the stack locally and to deploy it on Dokploy.

### Stack layout

- `backend/Dockerfile` exposes two build targets: `development` (Fastify in watch mode) and `production` (Fastify server with production dependencies only).
- `frontend/Dockerfile` exposes `development` (Vite dev server) and `production` (a lightweight Node image running `serve` to deliver the built SPA). The production build stage accepts two build arguments so you can wire the frontend to any backend URL:
  - `VITE_API_URL` (defaults to `http://localhost:3000`)
  - `VITE_WS_URL` (defaults to `ws://localhost:3000/ws`)
- Local Compose file: `docker-compose.yml`
- Dokploy Compose file: `docker-compose.prod.yml`
- Dokploy environment example: `.env.dokploy.example`

### Running locally with Docker

1. Make sure Docker Desktop (or an equivalent engine) is running.
2. Build and start the stack:
   ```bash
   docker compose up --build
   ```
3. Available endpoints:
   - Frontend (Node + `serve`): http://localhost:8080
   - Backend (Fastify API + websockets): http://localhost:3000 and ws://localhost:3000/ws
4. When you change code, rebuild to pick up the changes:
   ```bash
   docker compose up --build
   ```
5. To stop the stack:
   ```bash
   docker compose down
   ```

### Preparing Dokploy deployment

1. Copy `.env.dokploy.example` to `.env.dokploy` and set real domains. Example:
   ```dotenv
   BACKEND_DOMAIN=api.example.com
   FRONTEND_DOMAIN=app.example.com
   BACKEND_PORT=3000
   ```
   - `BACKEND_DOMAIN` is the host you will route to the Fastify API (used for HTTP and websockets).
   - `FRONTEND_DOMAIN` is the host that should serve the SPA through Traefik.
   - `BACKEND_PORT` should normally stay on `3000` unless you change the Fastify listen port.

2. Dokploy expects the external Traefik network named `dokploy-network` (created automatically by Dokploy itself). The production compose file joins that network and ships Traefik labels that:
   - Enable routing for both services.
   - Point the frontend to the HTTPS entrypoint with automatic certificates.
   - Route websockets and HTTP traffic through the backend service.

3. Deploy on Dokploy:
   - In the Dokploy UI, create a new **Docker Compose** project.
   - Point Dokploy to your repository and select `docker-compose.prod.yml` as the compose file.
   - Upload the `.env.dokploy` file in the **Environment** tab so the compose variables resolve.
   - Trigger a deploy. Dokploy will build both images from the repository and publish them behind Traefik using the labels defined in the compose file.

4. After the first deployment:
   - Verify the frontend loads via `https://<FRONTEND_DOMAIN>`.
   - Confirm API routes work via `https://<BACKEND_DOMAIN>/api/game/...`.
   - Check that websockets negotiate successfully (the Dokploy Traefik setup automatically handles them).

### Useful adjustments

- If you change the backend listen port, update both `BACKEND_PORT` in `.env.dokploy` and the `VITE_API_URL`/`VITE_WS_URL` build arguments (either directly in the compose files or through Dokploy build arguments).
- To run the frontend from a different domain locally, adjust the build arguments in `docker-compose.yml`.
- For Docker-based hot reload, duplicate `docker-compose.yml`, switch each service `target` to `development`, and mount your source directories; then run `npm install` once inside each container to hydrate `node_modules`.
- Dokploy supports automatic redeploys via Git webhooks. Once you confirm the initial deployment, wire a webhook (GitHub, GitLab, Bitbucket, Gitea, etc.) to Dokploy’s deploy URL from the project’s **Deployments** tab.

The compose setup follows Dokploy’s guidance for joining the `dokploy-network`, using Traefik labels, and exposing container ports instead of binding host ports—see the official documentation for more advanced options such as volume backups or container registry credentials.
