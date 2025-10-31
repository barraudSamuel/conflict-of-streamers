# Agent Handbook

Shared notes for anyone jumping into `conflict-of-streamers`. Keep this doc current so new agents can ramp quickly and experienced folks stay aligned.

## Fast Facts
- Two workspaces: Fastify backend under `backend/`, Vite + Vue 3 frontend under `frontend/`.
- Realtime loop hinges on websockets (`/ws`) and the Twitch anonymous chat bridge in `backend/services/TwitchService.js`.
- Local development assumes Node 20+, separate terminal per workspace, and `.env` files to keep secrets out of Git.

## Repository Layout
- `backend/src/server.js` spins up Fastify, registers `backend/routes/game.js` (prefixed `/api/game`), and wires the websocket handler from `backend/websocket/socketHandler.js`.
- `backend/managers/` owns in-memory game state (`GameManager`, `AttackManager`, `ReinforcementManager`, `PlayerManager`).
- `backend/services/` contains orchestration helpers: `TwitchService` (chat commands), `GameService`, `MapService`. Utilities live in `backend/utils/` (e.g., Twitch avatar scraper).
- `backend/data/territories.json` seeds the world map and is referenced by managers and services.
- `frontend/src/main.ts` bootstraps the SPA, `frontend/src/router/index.ts` exposes the `home`, `lobby`, and `game` routes.
- `frontend/src/views/` holds the page-level components; view logic leans on composables in `frontend/src/composables/` and helpers under `frontend/src/lib/` (notably `playerStorage.ts` for persistence).
- HTTP and websocket clients live in `frontend/src/services/api.ts` and `frontend/src/services/socket.ts`; UI primitives sit in `frontend/src/components/ui/`.

## Environment & Configuration
- Backend reads `PORT`, `FRONTEND_URL`, and Twitch-related settings from `backend/.env`. The committed sample sets `PORT=3001` and provides placeholder Twitch credentials—replace them locally, never commit real keys.
- Frontend expects `VITE_API_URL` and `VITE_WS_URL` during development. Create `frontend/.env.local` (ignored by Git) and point both values at the backend (`http://localhost:3001` and `ws://localhost:3001/ws`) unless you override the server port.
- `TWITCH_INTEGRATION.md` documents the anonymous chat mode, supported commands (`!attaque`, `!defend`, etc.), and websocket payloads—reference it whenever you touch the Twitch bridge.
- For Dokploy or other remote deployments, reuse `.env.dokploy.example` and align compose files (`docker-compose.yml`, `docker-compose.prod.yml`) with the chosen domains and ports.

## Local Development Workflow
1. Install dependencies once per workspace:
   - `cd backend && npm install`
   - `cd frontend && npm install`
2. Start services in separate shells:
   - Backend: `npm run dev` (Fastify with watch mode, logs to stdout, reads `.env`)
   - Frontend: `npm run dev` (Vite on `5173` unless overridden)
3. Websocket endpoint is fixed at `/ws`. `frontend/src/services/socket.ts` infers the WS URL from `VITE_API_URL` when `VITE_WS_URL` is not set.
4. Mock players quickly with `cd backend && npm run mock:players -- --code GAME --count 4` after creating a lobby.

## Testing Status & Expectations
- No automated tests ship today. `cd backend && npm test` currently exits with an error placeholder. Plan to introduce Fastify inject-based integration tests under `backend/tests/`.
- The frontend has no Vitest suite yet. Mirror components in `frontend/src/__tests__/` once tests exist and wire `npm test` at the root to invoke both workspaces.
- Until tests land, manual verification (creating/joining games, exercising websocket flows, validating Twitch command handling) is essential before shipping changes.

## Backend Implementation Notes
- Game lifecycle endpoints (`create`, `join`, `start`, `settings`, `attack`, `reinforcement`, etc.) reside in `backend/routes/game.js`. Manager methods throw descriptive errors; propagate them carefully to clients.
- `backend/websocket/socketHandler.js` keeps track of live connections per player/game, broadcasts state updates, and delegates attack/reinforcement lifecycles to the managers. Any new websocket message type should register in the same switch.
- `TwitchService` maintains anonymous tmi.js clients per player, synchronizes chat listeners when players join/leave, and exposes `setCommandHandler` hooks for realtime feedback. Treat channel normalization helpers and caching logic as shared utilities.
- `backend/scripts/mock-players.js` is CLI-friendly for seeding lobbies; keep its argument contract stable when altering join/assignment flows.
- Everything runs in-memory today—restarts wipe state. Flag this in PRs if you add persistence assumptions.

## Frontend Implementation Notes
- Vue components use `<script setup lang="ts">` and Tailwind utilities via `src/style.css` (Tailwind v4 + `tw-animate-css`). Keep new components PascalCased and colocate styles in SFCs when possible.
- `frontend/src/services/api.ts` wraps fetch calls; all responses expect the backend success envelope. Extend these helpers instead of calling fetch directly from views.
- `frontend/src/services/socket.ts` centralizes websocket creation. When adding new realtime features, introduce typed message helpers rather than sending raw JSON from scattered components.
- Player session data (IDs, admin flag, lobby code) persists through `frontend/src/lib/playerStorage.ts`. Update it whenever backend contract changes.
- Mapping and visualization assets live in `frontend/src/data/` and `frontend/src/components/maps/`; check existing structures before replacing geo JSON assets.

## Docker & Deployment
- `docker-compose.yml` targets the production stages of both Dockerfiles, exposing backend on `3000` and the compiled frontend via `serve` on `8080`.
- Use `docker-compose.prod.yml` together with Dokploy’s `dokploy-network` for hosted deployments—the compose file already declares the required Traefik labels.
- Multi-stage Dockerfiles support `development` targets if you need containerized hot reload; mount the repo and set the `target` to `development` when crafting custom compose configs.

## Contribution Guidelines
- Follow the existing style choices: backend uses ESM, 4-space indentation, and single quotes; frontend follows the Vue + Tailwind conventions already in place.
- Keep secrets out of Git, prefer `.env` copies, and document any new configuration keys with safe defaults.
- PRs should spell out impacted API routes or views and list manual verification steps (game creation, websocket interactions, Twitch command checks, docker build if relevant).

Keep this guide fresh—update sections when endpoints move, new scripts land, or the testing story evolves.
