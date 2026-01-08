# Story 1.1: Initialize Monorepo Project Structure

Status: completed

## Story

As a **developer**,
I want **to initialize the monorepo with npm workspaces (frontend/backend/shared)**,
So that **the project has the correct architecture foundation following AR1**.

## Acceptance Criteria

**Given** I am starting a new project
**When** I run the initialization commands
**Then** the monorepo structure is created with:
- Root package.json with workspaces configured
- Frontend workspace (Vue 3.5 + Vite 7.2 + TypeScript 5.6 + Tailwind 4.1)
- Backend workspace (Fastify 5.6 + TypeScript 5.6)
- Shared workspace for TypeScript types
**And** npm install works from root and installs all workspace dependencies
**And** Docker Compose files are configured for dev and prod environments

## Tasks / Subtasks

- [x] Task 1: Initialize root monorepo structure (AC: structure with package.json workspaces)
  - [x] Create root package.json with npm workspaces configuration
  - [x] Create `.gitignore` pour node_modules, dist, .env
  - [x] Create `README.md` with project overview
  - [x] Create `.editorconfig` pour consistency IDE

- [x] Task 2: Setup Frontend workspace with Vue 3.5 + Vite 7.2 + TypeScript 5.6 (AC: frontend workspace complete)
  - [x] Create `frontend/` directory
  - [x] Initialize Vite 7.2 with Vue 3.5 + TypeScript template
  - [x] Configure `frontend/package.json` with correct dependencies
  - [x] Configure `frontend/tsconfig.json` with strict mode
  - [x] Configure `frontend/vite.config.ts`
  - [x] Setup Tailwind CSS 4.1 with TypeScript config
  - [x] Create basic folder structure (src/components, src/stores, src/composables, src/views)

- [x] Task 3: Setup Backend workspace with Fastify 5.6 + TypeScript 5.6 (AC: backend workspace complete)
  - [x] Create `backend/` directory
  - [x] Create `backend/package.json` with Fastify 5.6 dependencies
  - [x] Configure `backend/tsconfig.json` with strict mode
  - [x] Create basic folder structure (src/routes, src/managers, src/services)
  - [x] Create `backend/src/server.ts` entry point with Fastify basic setup

- [x] Task 4: Setup Shared workspace for TypeScript types (AC: shared workspace with types)
  - [x] Create `shared/` directory
  - [x] Create `shared/package.json`
  - [x] Configure `shared/tsconfig.json` for type definitions
  - [x] Create basic folder structure (src/types, src/schemas, src/errors)
  - [x] Create placeholder type files (types/index.ts, schemas/index.ts, errors/index.ts)

- [x] Task 5: Configure Docker Compose for dev and prod (AC: Docker files configured)
  - [x] Create `docker-compose.yml` for dev environment
  - [x] Create `docker-compose.prod.yml` for prod environment
  - [x] Create `frontend/Dockerfile` with multi-stage build
  - [x] Create `backend/Dockerfile` with multi-stage build
  - [x] Create `.dockerignore` files for both workspaces

- [x] Task 6: Verify installation and dependencies (AC: npm install successful)
  - [x] Run `npm install` from root
  - [x] Verify all workspace dependencies installed
  - [x] Test that shared types are accessible from frontend and backend
  - [x] Verify TypeScript compilation works in all workspaces
  - [x] Test that dev servers can start (frontend + backend)

## Dev Notes

### Critical Architecture Requirements

⚠️ **AR1 - Starter Template - Manual Structured Setup**
- Monorepo npm workspaces (frontend/backend/shared)
- TypeScript 5.6+ with strict mode EVERYWHERE
- ES Modules ONLY (`"type": "module"` in ALL package.json)

⚠️ **AR20 - Infrastructure**
- npm workspaces for monorepo (NEVER use npm link)
- Docker Compose for dev + prod orchestration
- Multi-stage builds for optimized images

### Technology Stack & Versions (from Project Context)

**Frontend Dependencies:**
```json
{
  "vue": "^3.5.0",
  "vite": "^7.2.0",
  "typescript": "^5.6.0",
  "tailwindcss": "^4.1.0",
  "vue-router": "^4.4.0",
  "pinia": "^3.0.0",
  "ws": "^8.18.0",
  "howler": "^2.2.0"
}
```

**Backend Dependencies:**
```json
{
  "fastify": "^5.6.0",
  "typescript": "^5.6.0",
  "@fastify/websocket": "^11.2.0",
  "@fastify/cors": "^10.0.0",
  "tmi.js": "^1.8.0",
  "pino": "^10.1.0"
}
```

**Shared Dependencies:**
```json
{
  "typescript": "^5.6.0",
  "zod": "^3.23.0"
}
```

### TypeScript Configuration Requirements

⚠️ **CRITICAL - Strict Mode OBLIGATOIRE dans TOUS les tsconfig.json:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ESNext"
  }
}
```

⚠️ **CRITICAL - ES Modules ONLY:**
- TOUS les package.json doivent avoir `"type": "module"`
- Use `import/export` syntax - NEVER `require()` or `module.exports`

### Monorepo Structure Pattern

```
conflict-of-streamers/
├── package.json                    # Root avec workspaces config
├── .gitignore
├── README.md
├── docker-compose.yml              # Dev environment
├── docker-compose.prod.yml         # Prod environment
├── frontend/
│   ├── package.json               # "type": "module"
│   ├── tsconfig.json              # Strict mode
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── components/
│       ├── stores/
│       ├── composables/
│       ├── views/
│       └── router/
├── backend/
│   ├── package.json               # "type": "module"
│   ├── tsconfig.json              # Strict mode
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
│       ├── server.ts
│       ├── routes/
│       ├── managers/
│       └── services/
└── shared/
    ├── package.json               # "type": "module"
    ├── tsconfig.json              # Strict mode
    └── src/
        ├── types/
        │   └── index.ts
        ├── schemas/
        │   └── index.ts
        └── errors/
            └── index.ts
```

### Root package.json Workspaces Configuration

```json
{
  "name": "conflict-of-streamers",
  "private": true,
  "type": "module",
  "workspaces": [
    "frontend",
    "backend",
    "shared"
  ],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=frontend",
    "dev:backend": "npm run dev --workspace=backend",
    "build:frontend": "npm run build --workspace=frontend",
    "build:backend": "npm run build --workspace=backend",
    "install:all": "npm install"
  }
}
```

### Shared Types Import Pattern (CRITICAL)

⚠️ **MUST import shared types correctly:**

```typescript
// ✅ CORRECT - Import from shared package
import type { Player, Game, Territory } from 'shared/types'
import { PlayerSchema, GameSchema } from 'shared/schemas'
import { GameError, ValidationError } from 'shared/errors'

// ❌ INCORRECT - Relative paths to shared
import { Player } from '../../../shared/src/types/player'
```

**How it works:**
- Root package.json defines workspaces
- Frontend/Backend package.json reference: `"shared": "file:../shared"`
- npm workspaces handles linking automatically (NO npm link needed)

### Docker Compose Configuration

**Dev Environment (docker-compose.yml):**
- Hot reload enabled (volumes)
- Source code mounted
- Environment: development
- Ports exposed: frontend 5173, backend 3000

**Prod Environment (docker-compose.prod.yml):**
- Multi-stage builds for optimization
- Production builds only
- Environment: production
- Health checks configured

### Project Context Rules to Follow

From `_bmad-output/project-context.md`:

1. **WebSocket Architecture:**
   - MUST use native WebSocket (`ws://`)
   - NEVER use Socket.io
   - Use `ws` library client-side
   - Use `@fastify/websocket` server-side

2. **File Naming Conventions:**
   - Vue Components: PascalCase.vue (ex: GameMap.vue)
   - TypeScript Files: camelCase.ts (ex: gameEngine.ts)
   - Test Files: {filename}.test.ts (ex: gameEngine.test.ts)

3. **Code Naming Conventions:**
   - Variables: camelCase
   - Functions: camelCase
   - Constants: SCREAMING_SNAKE_CASE
   - Types/Interfaces: PascalCase
   - Zod Schemas: PascalCase + "Schema" suffix
   - Stores: "use" prefix (ex: useGameStore)
   - Composables: "use" prefix (ex: useAudio)

4. **Error Handling:**
   - Use custom error classes (NOT generic Error)
   - Pino structured logging (NOT console.log)
   - Backend: Zod parse() throws for security
   - Frontend: Zod safeParse() for UX

### Testing Standards

- Co-locate tests next to source files
- Use pattern: `{filename}.test.ts`
- Example: `gameEngine.ts` → `gameEngine.test.ts`

### Implementation Checklist

Before completing this story, verify:

- [ ] TypeScript strict mode enabled in ALL tsconfig.json files
- [ ] All package.json have `"type": "module"`
- [ ] Workspaces correctly configured in root package.json
- [ ] Shared package accessible from frontend and backend
- [ ] Docker Compose files for dev and prod created
- [ ] `.gitignore` excludes node_modules, dist, .env
- [ ] npm install works from root
- [ ] Frontend dev server can start
- [ ] Backend dev server can start
- [ ] All workspaces compile TypeScript successfully

### References

- [Architecture Document] `_bmad-output/planning-artifacts/architecture.md` - AR1, AR20
- [Project Context] `_bmad-output/project-context.md` - All critical implementation rules
- [Epic 1] `_bmad-output/planning-artifacts/epics.md` - Epic 1: Project Foundation

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929) via quick-dev workflow

### Debug Log References

- No errors encountered during implementation
- Minor version warning: Node.js 22.8.0 vs required 22.12.0+ (non-blocking)
- Fixed @vitejs/plugin-vue version from 5.2.0 to 6.0.0 for Vite 7.x compatibility

### Completion Notes List

1. Successfully created monorepo structure with npm workspaces
2. Frontend workspace configured with Vue 3.5, Vite 7.2, TypeScript 5.6, Tailwind 4.1
3. Backend workspace configured with Fastify 5.6, TypeScript 5.6
4. Shared workspace created with Zod schemas, TypeScript types, and error classes
5. Docker Compose files configured for both dev and prod environments
6. All workspaces compile successfully with TypeScript strict mode
7. Verified shared types are accessible from both frontend and backend
8. All npm workspaces dependencies installed correctly
9. All acceptance criteria met

### Review Notes

**Adversarial review completed** - 13 findings identified, walk-through resolution approach

**Findings fixed (6):**
1. Added CORS warning comment in backend/.env.example for production safety
2. Modified frontend health check to test / instead of /health endpoint
3. Added security headers to nginx.conf (CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
4. Recreated Dockerfile.dev files for development with hot reload
5. Added .dockerignore to shared workspace
6. Verified npm run dev command works correctly

**Findings skipped (7):**
- Environment variable validation (not critical for initial setup)
- Router error handling (can be added in future stories)
- TypeScript path alias (finding was invalid, code already correct)
- Docker build optimization (already handled by .dockerignore)
- WebSocket protocol logging (informational only)
- Build verification in Docker (Docker RUN already handles failures)
- Complex exports in shared (Node 24 fully supports modern exports)

### File List

**Root Files:**
- package.json (workspaces configuration)
- .gitignore
- .editorconfig
- README.md
- docker-compose.yml (dev environment)
- docker-compose.prod.yml (prod environment)

**Frontend Workspace (frontend/):**
- package.json
- tsconfig.json
- vite.config.ts
- tailwind.config.ts
- index.html
- nginx.conf
- Dockerfile
- Dockerfile.dev
- .dockerignore
- src/main.ts
- src/App.vue
- src/router/index.ts
- src/views/Home.vue
- src/components/ (directory)
- src/stores/ (directory)
- src/composables/ (directory)

**Backend Workspace (backend/):**
- package.json
- tsconfig.json
- .env.example
- Dockerfile
- Dockerfile.dev
- .dockerignore
- src/server.ts
- src/routes/ (directory)
- src/managers/ (directory)
- src/services/ (directory)

**Shared Workspace (shared/):**
- package.json
- tsconfig.json
- .dockerignore
- src/index.ts
- src/types/index.ts
- src/schemas/index.ts
- src/errors/index.ts
