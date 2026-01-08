# Conflict of Streamers

Un jeu de conquête territoriale en temps réel où les viewers Twitch s'affrontent pour dominer une carte mondiale.

## Architecture

Ce projet utilise une architecture monorepo avec npm workspaces:

- **frontend/**: Application Vue 3.5 + Vite 7.2 + TypeScript 5.6 + Tailwind 4.1
- **backend/**: API Fastify 5.6 + TypeScript 5.6 + WebSocket natif
- **shared/**: Types TypeScript partagés + Schémas Zod

## Technologies

### Frontend
- Vue 3.5 (Composition API)
- Vite 7.2
- TypeScript 5.6
- Tailwind CSS 4.1
- Pinia 3 (state management)
- Vue Router 4.4
- Native WebSocket (`ws`)
- Howler.js (audio)
- Canvas 2D (rendering)

### Backend
- Fastify 5.6
- TypeScript 5.6
- @fastify/websocket 11.2 (WebSocket natif)
- @fastify/cors 10.0
- tmi.js 1.8 (Twitch IRC)
- Pino 10.1 (logging)

### Shared
- TypeScript 5.6
- Zod 3.23+ (validation)

## Installation

```bash
# Installer toutes les dépendances
npm install

# Lancer le mode développement (frontend + backend)
npm run dev

# Lancer uniquement le frontend
npm run dev:frontend

# Lancer uniquement le backend
npm run dev:backend
```

## Build

```bash
# Build pour production (tous les workspaces)
npm run build

# Build frontend uniquement
npm run build:frontend

# Build backend uniquement
npm run build:backend
```

## Docker

```bash
# Lancer en mode développement
npm run docker:dev

# Lancer en mode production
npm run docker:prod
```

## Structure du Projet

```
conflict-of-streamers/
├── frontend/          # Application Vue 3.5
│   ├── src/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── composables/
│   │   ├── views/
│   │   └── router/
│   └── package.json
├── backend/           # API Fastify 5.6
│   ├── src/
│   │   ├── routes/
│   │   ├── managers/
│   │   └── services/
│   └── package.json
├── shared/            # Types partagés
│   ├── src/
│   │   ├── types/
│   │   ├── schemas/
│   │   └── errors/
│   └── package.json
└── package.json       # Root avec workspaces
```

## Règles de Développement

### TypeScript
- Strict mode OBLIGATOIRE dans tous les workspaces
- ES Modules ONLY (`"type": "module"`)
- Jamais d'utilisation du type `any`

### WebSocket
- TOUJOURS utiliser WebSocket natif (protocole `ws://`)
- JAMAIS utiliser Socket.io

### Vue 3
- TOUJOURS utiliser Composition API
- JAMAIS utiliser Options API

### State Management
- Updates IMMUTABLES dans les stores Pinia
- Utiliser spread operators pour mutations

### Validation
- Frontend: `safeParse()` pour UX
- Backend: `parse()` pour sécurité

## License

MIT
