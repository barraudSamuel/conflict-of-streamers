# Repository Guidelines

## Project Structure & Module Organization
`backend/` holds the Fastify API and websocket layer: HTTP handlers in `backend/routes/`, domain logic in `backend/services/` and `backend/managers/`, seed data in `backend/data/`, and realtime glue in `backend/websocket/socketHandler.js`. `frontend/` is a Vite + Vue 3 TypeScript app; entrypoints live in `frontend/src/main.ts` and `frontend/src/App.vue`, routed screens in `frontend/src/views/`, shared helpers in `frontend/src/lib/`, and HTTP calls in `frontend/src/services/api.ts`. Consult `TWITCH_INTEGRATION.md` for platform credentials.

## Build, Test & Development Commands
Install dependencies per workspace: `cd backend && npm install`, `cd frontend && npm install`. Run `npm run dev` in each directory to start the Fastify API on port 3000 and the Vite dev server on port 5173. Build the frontend with `npm run build` to populate `frontend/dist/`. Use `npm start` in `backend/` for production-like runs once your `.env` is in place. The backend `npm test` script is currently a stub.

## Coding Style & Naming Conventions
Backend code uses ECMAScript modules, 4-space indentation, single quotes, and camelCase (`setupWebSocket`). Group related handlers within `routes/` and keep services pure so they can be reused in websocket flows. Frontend code follows Vue SFC conventions: PascalCase component filenames (`Lobby.vue`), `<script setup lang="ts">`, and Tailwind utility classes in scoped style blocks. Place cross-cutting helpers in `src/lib/` and remote calls in `src/services/`.

## Testing Guidelines
No automated suite exists yet. Add backend integration tests under `backend/tests/` using Fastify’s inject helpers or supertest-style assertions, and frontend unit tests under `frontend/src/__tests__/` with Vitest. Update the relevant `package.json` scripts so `npm test` becomes the single entry point, and version any new fixtures alongside `backend/data/`.

## Commit & Pull Request Guidelines
Existing history uses concise, imperative subject lines (e.g., “Add backend game routes…”). Keep subjects ≤72 characters, and add a body describing motivation or validation when it prevents back-and-forth. Pull requests should outline the change, list impacted routes or views, link issues, and include verification steps (commands, URLs, screenshots). Flag schema or API changes early so both tiers stay in sync.

## Configuration & Environment
Secrets and runtime settings belong in `.env` files that stay out of Git. Define `PORT`, `FRONTEND_URL`, and any Twitch credentials described in `TWITCH_INTEGRATION.md`. Never commit real tokens; if you add new keys, update the example config and use unique local values to avoid collisions with production bots.
