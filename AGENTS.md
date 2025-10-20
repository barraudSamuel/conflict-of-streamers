# Repository Guidelines

Fast navigation and consistent workflows keep delivery quick. Use this guide to onboard new contributors and align ongoing work across the backend Fastify service and the Vue frontend.

## Project Structure & Module Organization
- `backend/` hosts the Fastify API, websocket glue, domain services, and sample data. Route handlers live in `backend/routes/`, with companion logic in `backend/services/` and `backend/managers/`. Realtime utilities are in `backend/websocket/socketHandler.js`.
- `frontend/` contains the Vite + Vue 3 application. Entrypoints sit in `frontend/src/main.ts` and `frontend/src/App.vue`, routed screens under `frontend/src/views/`, shared helpers inside `frontend/src/lib/`, and HTTP clients in `frontend/src/services/`.

## Build, Test & Development Commands
- `cd backend && npm install` / `cd frontend && npm install` — install workspace dependencies.
- `npm run dev` (run from backend or frontend) — start the Fastify API on port 3000 and the Vite dev server on port 5173.
- `cd frontend && npm run build` — emit production assets into `frontend/dist/`.
- `cd backend && npm start` — run the API with production-like settings once `.env` is configured.
- `npm test` — reserved as the unified entry point; wire new test suites to this script.

## Coding Style & Naming Conventions
- Backend uses ECMAScript modules, 4-space indentation, single quotes, and camelCase (e.g., `setupWebSocket`). Group related HTTP handlers by route file.
- Frontend favors Vue SFCs with `PascalCase.vue` filenames, `<script setup lang="ts">`, scoped styles, and Tailwind utility classes.
- House shared helpers in `src/lib/` and keep remote calls in `src/services/api.ts` to simplify reuse between routes and websocket flows.

## Testing Guidelines
- Add backend integration tests under `backend/tests/` using Fastify inject helpers or Supertest-style assertions.
- Keep frontend unit tests in `frontend/src/__tests__/` with Vitest. Mirror component or service names in test filenames.
- Ensure each workspace wires its tests into `npm test` so CI can execute a single command.

## Commit & Pull Request Guidelines
- Write concise, imperative commit subjects ≤72 characters (e.g., “Add backend game routes”). Add bodies when context or validation steps prevent rework.
- Pull requests should outline the change set, list impacted routes or views, link issues, and include verification steps (commands, URLs, screenshots). Flag schema or API shifts early to keep both tiers synchronized.

## Security & Configuration Tips
- Store secrets and runtime configuration in `.env` files kept out of Git. Define `PORT`, `FRONTEND_URL`, and Twitch credentials per `TWITCH_INTEGRATION.md`.
- Provide safe example values when introducing new keys, and avoid sharing production tokens in discussion threads.
