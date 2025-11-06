# Agent Handbook

Shared notes for anyone jumping into `conflict-of-streamers`. Keep this doc current so new agents can ramp quickly and experienced folks stay aligned.

## Fast Facts
- Two workspaces: Fastify + websockets backend under `backend/`, Vite + Vue 3 + TypeScript frontend under `frontend/`.
- Game state lives entirely in memory: `Game`, `Attack`, `Reinforcement`, and `Player` models drive the loop; restarts wipe all sessions.
- Realtime flow: clients hit REST (`/api/game/*`) to manage lobbies, then stay in sync through the `/ws` socket; Twitch chat commands (anonymous `tmi.js`) feed the same managers.
- Plan for Node 20+, one terminal per workspace, and local `.env` files so ports and Twitch settings do not leak to Git.

## Repository Layout
- `backend/src/server.js` boots Fastify, registers `backend/routes/game.js` under `/api/game`, and mounts `/ws` via `@fastify/websocket`.
- `backend/routes/game.js` exposes lifecycle routes (create/join/start/settings) plus helpers for territories, attacks, reinforcements, and debug listings.
- `backend/models/` defines the stateful entities (`Game`, `Attack`, `Player`, `Reinforcement`) that serialize to the clients and encapsulate scoring, adjacency, and bot behavior.
- `backend/managers/` coordinates live state: `GameManager` tracks games ↔ players, `AttackManager` and `ReinforcementManager` run timers + scoring, `PlayerManager` assigns colors/avatars and keeps online status.
- `backend/services/` handles orchestration: `TwitchService` mirrors chat into the game loop, `GameService` wraps high-level flows (start, validation, leaderboard), `MapService` loads `backend/data/territories.json` plus graph helpers.
- `backend/websocket/socketHandler.js` maintains connected players per game, relays updates, and routes messages such as `attack:start` and `reinforcement:start`.
- `backend/scripts/mock-players.js` provides CLI seeding; `backend/utils/picture-profile.js` scrapes Twitch avatars when players join.
- `frontend/src/main.ts` wires the app, `frontend/src/router/index.ts` exports `home`, `lobby`, and `game` routes, and `frontend/src/views/*.vue` contain the page shells.
- `frontend/src/composables/useGameView.ts` is the realtime brain (websocket lifecycle, action log, attack/reinforcement validation) and `frontend/src/composables/useAudioManager.ts` handles music + SFX mixing with persisted settings.
- `frontend/src/services/api.ts` wraps every REST call, `frontend/src/services/socket.ts` centralizes websocket creation, and `frontend/src/lib/` contains persistence (`playerStorage.ts`) and audio settings utilities.
- `frontend/src/components/game/` holds the in-game HUD (scoreboard, command center, dialogs), `frontend/src/components/maps/LobbyDeckMap.vue` renders the deck.gl lobby map, and `frontend/src/components/ui/` wraps the Reka UI primitives.
- `frontend/src/types/game.ts` defines the structures mirrored from the backend; `frontend/public/` serves assets and audio (`/sfx`).

## Environment & Configuration
- Backend looks for `backend/.env`. Set at least `PORT` (defaults to `3000`) and `FRONTEND_URL` (for CORS). Twitch chat runs in anonymous mode, so no OAuth secrets are required today.
- The mock CLI (`backend/scripts/mock-players.js`) optionally reads `API_URL`—keep it aligned with the REST base you expose.
- Frontend requires explicit endpoints: create `frontend/.env.local` with `VITE_API_URL=http://localhost:3000` and `VITE_WS_URL=ws://localhost:3000/ws` (adjust if you change the backend port). Without those keys Vite falls back to `http://localhost:3001`, which will fail unless you also change the backend.
- `TWITCH_INTEGRATION.md` lists the chat commands, payload shapes, and anonymous connection constraints. Reference it whenever altering Twitch-facing behavior.
- Container deployments rely on `.env.dokploy.example`, `docker-compose.yml`, and `docker-compose.prod.yml` to inject URLs and ports—keep the compose build args (`VITE_API_URL`, `VITE_WS_URL`, `PORT`) in sync.

## Local Development Workflow
1. Install dependencies once per workspace:
   - `cd backend && npm install`
   - `cd frontend && npm install`
2. Start services in separate shells:
   - Backend: `npm run dev` (Fastify with watch mode, logs to stdout, reads `.env`)
   - Frontend: `npm run dev` (Vite defaults to `5173`)
3. Ensure `frontend/.env.local` points to the same backend base before launching the SPA; restart Vite if you change env values.
4. Websocket endpoint is fixed at `/ws`; `frontend/src/services/socket.ts` derives the URL from `VITE_API_URL` when `VITE_WS_URL` is omitted.
5. Seed lobbies or stress flows with `cd backend && npm run mock:players -- --code GAME --count 4` once a game code exists.

## Testing Status & Expectations
- No automated tests ship today. `cd backend && npm test` currently exits with an error placeholder. Plan to introduce Fastify inject-based integration tests under `backend/tests/`.
- The frontend has no Vitest suite yet. Mirror components in `frontend/src/__tests__/` once tests exist and wire `npm test` at the root to invoke both workspaces.
- Until tests land, manual verification is essential: cover lobby creation/join, websocket-driven attack + reinforcement loops, Twitch command ingestion, audio toggles, and scoreboard updates before shipping.

## Backend Implementation Notes
- `Game` instances seed all territories through `MapService`, enforce adjacency, and promote unclaimed regions to bot defenders when a game starts. Settings sanitize numeric inputs and now include reinforcement/command multipliers.
- `PlayerManager` assigns unique colors, fetches avatars via `picture-profile.js`, tracks online state, and provides helper stats for leaderboards. Re-use its helpers to avoid diverging player caches.
- `AttackManager` validates adjacency/ownership, spins `Attack` timers, aggregates contributions from Twitch chat + websocket payloads, awards score bonuses, and ends games when a single owner remains.
- `ReinforcementManager` mirrors that pattern for defensive boosts—only one reinforcement per territory, with contributions raising `defensePower`.
- `TwitchService` holds per-player anonymous `tmi.js` clients, keeps channel membership in sync with game rosters, parses/normalizes chat commands, and emits high-level events (`command:received`, announcements). Always use its helpers rather than talking to `tmi.js` directly.
- `GameService` consolidates multi-manager workflows (create/join/start, leaderboard building, state snapshots). Favour calling it when adding combined flows or new endpoints.
- Websocket messages dispatch through `backend/websocket/socketHandler.js`; register new message types there and broadcast via `broadcastToGame` to keep clients aligned.
- State is ephemeral. Consider persistence impacts (e.g., timers, Twitch connections) before introducing storage or cross-process features.

## Frontend Implementation Notes
- Vue components use `<script setup lang="ts">` with Tailwind v4 classes (`src/style.css`) and `tw-animate-css`. Keep new SFCs PascalCased and colocate styles in the `<style>` block.
- `useGameView` owns websocket lifecycle, API hydration, action logs, scoreboards, and modal state. Extend it (or split sub-composables) before sprinkling logic across components.
- `useAudioManager` centralizes theme/attack music and horn SFX while persisting knobs in local storage. Re-use its API instead of spawning new `Audio` instances.
- `services/api.ts` expects the backend success envelope; add new functions there to keep fetch logic out of views. `services/socket.ts` computes websocket URLs from env and exposes helpers (`createGameSocket`, `sendSocketMessage`, `isSocketOpen`).
- UI is built from `components/game/*` (HUD, dialogs, overlays), shared primitives in `components/ui/` (Reka UI wrappers), and lobby map pieces (`components/maps/LobbyDeckMap.vue` using deck.gl + topojson data under `src/data/`).
- Session persistence flows through `lib/playerStorage.ts`; update its schema in lock-step with backend payload changes and bump migrations if necessary.
- Types mirrored from the backend live in `src/types/game.ts`; keep them aligned with backend serializers (`Game#toJSON`, `Attack#toJSON`, `Reinforcement#toJSON`).

## Docker & Deployment
- `docker-compose.yml` builds production images, publishing Fastify on `3000` and the built SPA (served via `serve`) on `8080`.
- `docker-compose.prod.yml` targets Dokploy, joining the `dokploy-network` and adding Traefik labels for HTTPS routing; use `.env.dokploy` to feed domains and ports.
- Both Dockerfiles expose `development` targets for hot reload. Mount the repo, pick the `development` target, and hydrate `node_modules` inside the container if you go that route.
- Build args `VITE_API_URL` / `VITE_WS_URL` and the backend `PORT` must stay aligned across compose files, Dokploy env vars, and `.env` files to avoid CORS + websocket mismatches.

## Contribution Guidelines
- Follow the existing style choices: backend uses ESM, 4-space indentation, and single quotes; frontend follows the Vue + Tailwind conventions already in place.
- Keep secrets out of Git, prefer `.env` copies, and document any new configuration keys with safe defaults.
- Add succinct comments only when logic is non-obvious (e.g., tricky websocket flows or scoring formulas). Prefer function extractions over dense inline code.
- Extend shared helpers (`GameService`, `playerStorage`, `useGameView`, `services/*`) instead of duplicating logic.
- PRs should call out impacted routes, websocket events, Twitch command handling, or UI surfaces, and list manual verification steps (lobby flow, attacks/defense/reinforcement, Twitch bridging, docker build when relevant).

Keep this guide fresh—update sections when endpoints move, new scripts land, or the testing story evolves.
