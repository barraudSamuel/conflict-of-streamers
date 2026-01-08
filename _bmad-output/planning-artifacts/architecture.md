---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
workflowType: 'architecture'
project_name: 'conflict-of-streamers'
user_name: 'sam'
date: '2026-01-07'
lastStep: 8
status: 'complete'
completedAt: '2026-01-08'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

Le projet comporte 57 exigences fonctionnelles organisées en 9 domaines :

1. **Game Setup & Configuration (FR1-FR6)** : Création de partie avec pseudo Twitch, configuration paramètres (durée batailles, cooldown), génération code unique, récupération automatique avatars
2. **Lobby & Pre-Game (FR7-FR11)** : Synchronisation temps réel joueurs, sélection territoire sur grille 20×20, instructions intégrées
3. **Twitch Integration (FR12-FR16)** : Connexion tmi.js anonyme, parsing commandes chat ("ATTACK/DEFEND"), comptage messages + utilisateurs uniques, gestion délai 2-4 sec, reconnexion automatique
4. **Combat & Gameplay Core (FR17-FR24)** : Attaque/défense territoires adjacents, verrous d'état (un territoire ne peut pas attaquer ET être attaqué), batailles chronométrées (paramètre configurable), formule équilibrage proportionnel, stats territoriales inversées, transfert propriété
5. **Real-Time Feedback & Visualization (FR25-FR29)** : Barres progression temps réel, feed messages validés (background vert), mise à jour grille synchronisée, actions visibles en temps réel
6. **Battle Summary & Recognition (FR30-FR33)** : Résumés post-bataille avec top 5 spammers, % participation, reconnaissance contributions individuelles
7. **Victory & Game End (FR34-FR37)** : Détection conditions victoire, écran final avec stats, classement, relance partie
8. **BOT Territories & Free Zones (FR38-FR40)** : Gestion zones libres, conquête possible, résistance proportionnelle
9. **Rage-Quit & Player Management (FR41-FR43)** : Détection déconnexion, libération territoires, reconnexion en cours de partie
10. **Audio & Atmosphere (FR44-FR49)** : Musique orchestrale (lobby/jeu/bataille), SFX synchronisés, contrôle volume, persistance préférences LocalStorage
11. **Advanced UI & Interaction (FR50-FR53)** : Leaderboard avec touche Tab, historique actions, tutoriel page accueil, interface optimisée streaming (18px+, contrastes)
12. **WebSocket & Real-Time Communication (FR54-FR57)** : Connexion bidirectionnelle latence < 200ms, reconnexion auto, maintien état, synchronisation tous clients

**Non-Functional Requirements:**

16 NFRs critiques qui vont structurer l'architecture :

- **Performance (NFR1-NFR5)** : WebSocket < 200ms, UI réactive < 100ms, calculs bataille < 500ms, chargement carte < 1 sec, support 10 connexions simultanées sans dégradation > 10%
- **Fiabilité (NFR6-NFR10)** : Détection déconnexion < 5 sec, resynchronisation < 2 sec, cohérence état en mémoire, reconnexion IRC toutes les 10 sec, parsing Twitch graceful
- **Intégration Twitch (NFR11-NFR13)** : Priorisation réactivité streamer vs délai chat viewer, mode anonyme sans OAuth, parsing tolérant (casse, espaces)
- **Compatibilité & Environnement (NFR14-NFR16)** : Navigateurs modernes uniquement (< 2 ans), Node.js LTS, configuration dynamique sans redéploiement

**Scale & Complexity:**

- **Primary domain:** Web App Full-Stack (SPA temps réel + Backend WebSocket + Intégration Twitch IRC)
- **Complexity level:** Medium
- **Estimated architectural components:** ~12-15 composants majeurs
  - Frontend : 5-6 views/screens (Home, Lobby, Game, Battle UI, Victory)
  - Frontend : 15-20 composants UI réutilisables
  - Frontend : Services (WebSocket client, Audio manager, State management)
  - Backend : WebSocket server avec room management
  - Backend : Twitch IRC integration (tmi.js)
  - Backend : Game engine (combat resolution, territoire stats)
  - Shared : Modèles de données (Game, Player, Territory, Battle)

### Technical Constraints & Dependencies

**Contraintes Techniques Identifiées :**

1. **Délai Twitch IRC incompressible** : 2-4 secondes entre émission message viewer et réception serveur - le système doit être conçu autour de cette latence
2. **État en mémoire uniquement** : Pas de base de données, pas de persistance - architecture stateless avec état éphémère par partie
3. **Capacité limitée** : VPS configuré pour ~10 joueurs simultanés maximum - pas besoin de scalabilité horizontale
4. **Navigateurs modernes uniquement** : Pas de support legacy, peut utiliser ES6+, WebSocket natif, Canvas/WebGL sans polyfills
5. **Mode anonyme Twitch** : Connexion IRC sans authentification OAuth - simplifie l'intégration mais limite les features Twitch API

**Dépendances Clés :**

- **tmi.js** : Bibliothèque Twitch IRC (contrainte technique pour intégration chat)
- **Socket.io** : WebSocket avec fallbacks pour communication temps réel
- **Canvas rendering** : Pour grille 20×20 performante (Canvas 2D natif - décision AD-1)
- **Web Audio API ou Howler.js** : Gestion audio orchestral + SFX
- **Vue 3 + Pinia** : Framework SPA avec state management (décision AD-4)
- **Node.js Backend** : Serveur WebSocket + logique jeu

### Cross-Cutting Concerns Identified

**Concerns Majeurs Affectant Plusieurs Composants :**

1. **Synchronisation État Temps Réel**
   - Tous les clients doivent voir l'état du jeu de façon cohérente
   - WebSocket broadcasting pour updates (attaques, résultats, changements propriété)
   - Gestion conflits potentiels (actions simultanées)
   - Latence critique < 200ms

2. **Performance Rendering**
   - Grille 20×20 avec ~20 territoires animés
   - Barres de progression fluides (60 FPS)
   - Feed messages défilant sans lag (potentiellement 100+ msg/sec)
   - Optimisations : Canvas 2D natif, throttling updates, échantillonnage messages

3. **Résilience & Reconnexion**
   - WebSocket : reconnexion automatique avec resynchronisation état
   - Twitch IRC : reconnexion toutes les 10 sec si échec
   - Maintien cohérence jeu pendant déconnexions courtes
   - Gestion rage-quit (libération territoires)

4. **Feedback Multi-Canal Utilisateur**
   - Visuel : barres progression, feed messages, animations carte, résumés bataille
   - Audio : musiques contextuelles (lobby/jeu/bataille), SFX synchronisés
   - Chat recognition : pseudos viewers dans leaderboards, validation visuelle commandes
   - Réactivité < 100ms pour feedback immédiat

5. **Configuration Flexible**
   - Paramètres jeu ajustables par créateur partie (durées, multiplicateurs, cooldowns)
   - Pas de redéploiement requis
   - Persistance configuration par partie (en mémoire)
   - Interface admin simplifiée

6. **Équilibrage Gameplay**
   - Formule combat proportionnel : Force = (messages × 0.7) + (users_uniques × bonus_territoire)
   - Stats territoriales inversées dynamiques (taille territoire ↔ bonus)
   - Calculs < 500ms pour ne pas bloquer gameplay
   - Paramètres ajustables pour tuning post-livraison

## Architecture Decisions Summary

### AD-1: Canvas 2D Native Rendering

**Décision** : Utiliser Canvas 2D natif pour le rendu de la grille 20×20

**Options Évaluées :**

| Option | Avantages | Inconvénients | Performance | Complexité |
|--------|-----------|---------------|-------------|------------|
| **Canvas 2D natif** | Léger, API simple, zero dependency | Moins de features avancées | Excellent pour 20×20 | Faible |
| **PixiJS (WebGL)** | Très performant, riche en features, effects visuels | Bundle size +200KB, courbe apprentissage | Overkill pour ce cas | Moyenne |
| **SVG/DOM** | Facile à manipuler, inspectable | Performance insuffisante pour 60 FPS | Inadapté | Faible |

**Rationale** : Pour une grille 20×20 avec animations basiques, Canvas 2D natif offre le meilleur ratio performance/simplicité. Maintient 60 FPS sans dépendance lourde. WebGL serait pertinent pour 100×100+ ou effets visuels complexes non requis ici.

**Impact** : Zero dependency pour rendering, API native simple, bundle size optimisé

---

### AD-2: Event-Sourced Real-Time Sync

**Décision** : Event-sourcing côté serveur + State Machine + Optimistic UI client

**Options Évaluées :**

| Approche | Avantages | Inconvénients | Latency | Complexité |
|----------|-----------|---------------|---------|------------|
| **Event-sourced + State Machine** | Validation robuste, historique gratuit | Plus de code serveur | Excellente | Moyenne |
| **Simple state broadcast** | Très simple, rapide à implémenter | Risque de states incohérents | Bonne | Faible |
| **Optimistic UI (client)** | Feedback instant < 100ms | Rollbacks possibles (UX confusing?) | Excellente | Moyenne |

**Rationale** : Le combo garantit validation robuste (state machine), feedback instant (optimistic UI), et performance (event-driven). La complexité moyenne est justifiée par les contraintes NFR strictes (< 200ms serveur, < 100ms UI).

**Architecture Pattern :**
- **Serveur** : Event-sourcing avec state machine validant les transitions (territoire peut-il attaquer? est-il déjà en combat?)
- **Client** : Optimistic UI - update immédiat, puis confirmation serveur ou rollback
- **Broadcasts** : Events WebSocket optimistes pour feedback instant, confirmations authoritative pour cohérence

**Impact** : Satisfait NFR1 (< 200ms latency) et NFR2 (< 100ms UI feedback), validation robuste des règles de jeu

---

### AD-3: Dual Counting for Twitch Delay Compensation

**Décision** : Compteur optimiste (UI) + Compteur authoritative (serveur) + Échantillonnage feed + Reconnexion auto IRC

**Problème à Résoudre :** Délai Twitch IRC incompressible 2-4 sec vs requirement feedback viewer < 100ms

**Options Évaluées :**

| Approche | Avantages | Inconvénients | UX Viewer | Complexité |
|----------|-----------|---------------|-----------|------------|
| **Buffer + calcul final uniquement** | Simple, pas de faux espoir | Pas de feedback immédiat (mauvais UX) | Pauvre | Faible |
| **Double comptage (optimiste + authoritative)** | Feedback instant + calcul précis | Légère désynchronisation possible | Excellente | Moyenne |
| **Affichage tous les messages** | Transparence totale | Performance catastrophique (DOM) | Bonne mais lag | Élevée |
| **Échantillonnage messages (10-15/sec)** | Performance + impression de masse | Pas 100% des pseudos visibles | Très bonne | Faible |

**Rationale** :
- **Barre progression** = compteur optimiste côté client (réactivité < 100ms pour viewers, utilise échantillonnage des messages visibles)
- **Calcul force final** = compteur serveur authoritative (équité via messages IRC réels reçus par tmi.js)
- **Feed messages** = échantillonnage 10-15 msg/sec (performance DOM garantie, impression de spam massif)
- **Bot IRC** = reconnexion automatique toutes les 10 sec (résilience NFR9)

**Implementation Details :**
- Client simule comptage basé sur messages visibles dans le feed pour UX réactive
- Serveur compte tous les messages IRC réels pour calcul authoritative
- Désynchronisation acceptable (~2-4 sec) car transparente pour viewers (ils voient feedback immédiat)
- Résultat final basé uniquement sur compteur serveur (équité garantie)

**Impact** : Compense délai IRC tout en garantissant équité, feedback viewer excellent, performance DOM maintenue

---

### AD-4: Vue 3 + Pinia Frontend Stack

**Décision** : Vue 3 avec Pinia pour state management et réactivité temps réel

**Options Évaluées :**

| Framework | Performance | Bundle Size | Écosystème | Learning Curve | WebSocket Sync | UI Libraries |
|-----------|-------------|-------------|------------|----------------|----------------|--------------|
| **Vue 3 + Pinia** | Excellente | ~50KB gzip | Mature | Douce | Excellente (réactivité native) | shadcn-vue, PrimeVue, Naive UI |
| **React + Zustand** | Bonne* | ~70KB gzip | Très mature (+ de packages) | Douce | Bonne (nécessite optimisations) | shadcn/ui, MUI, Chakra |
| **Svelte** | Exceptionnelle | ~20KB gzip | Moyen | Moyenne | Excellente (réactivité compilée) | Moins fourni |

*Avec optimisations manuelles (useMemo, React.memo)

**Rationale** :
- **Réactivité native** : Excellente pour synchronisation WebSocket temps réel (updates fréquentes)
- **Composition API** : Structure code propre, logique réutilisable (composables pour WebSocket, Audio, etc.)
- **Single File Components** : Organisation claire, co-location template/script/style
- **Performance** : Excellente out-of-the-box sans optimisations manuelles
- **Écosystème UI** : shadcn-vue, PrimeVue, Naive UI pour beaux rendus modernes
- **Dev solo** : Learning curve douce, DX excellent

**Alternative considérée** : React a un écosystème plus large, mais nécessite optimisations manuelles pour updates temps réel fréquentes. Vue offre meilleur équilibre pour ce use case.

**Impact** : Développement plus rapide, moins d'optimisations manuelles, réactivité WebSocket naturelle

---

### AD-5: Monolithic Modular Backend Architecture

**Décision** : Node.js monolithe avec Fastify 5.6 + fastify-websocket 11.2 + modules séparés

**Options Évaluées :**

| Framework Backend | Performance | TypeScript Support | WebSocket | Overhead | Learning Curve |
|-------------------|-------------|-------------------|-----------|----------|----------------|
| **Fastify + ws natif** | Exceptionnelle (2x Express) | Natif, excellent | fastify-websocket (léger) | Minimal | Moyenne |
| **Express + Socket.io** | Bonne | Via @types (tiers) | Socket.io (features riches) | Moyen | Faible |
| **NestJS** | Bonne | Excellent (built-in) | @nestjs/websockets | Élevé | Élevée |

**Rationale :**
- **Performance** : Fastify 5.6 est 2x plus rapide qu'Express (critique pour temps réel)
- **TypeScript natif** : Types first-class, pas de @types tiers nécessaires
- **WebSocket natif** : fastify-websocket 11.2 avec protocole ws:// standard (plus léger que Socket.io)
- **Overhead minimal** : Pour 10 joueurs max, WebSocket natif suffit largement (pas besoin Socket.io rooms/broadcasting complexe)
- **Logging Pino 10.1** : Ultra performant, intégré Fastify par défaut
- **Plugin architecture** : Clean, extensible (WebSocket, CORS, etc.)

**Architecture Modules :**
```
Node.js 20 LTS + Fastify 5.6 + fastify-websocket 11.2
├── Room Manager (une room = une partie, TTL 30 min si vide)
├── Game Engine (combat resolution, state machine, formule équilibrage)
├── Twitch IRC Manager (tmi.js, un bot par room, reconnexion auto)
└── WebSocket Handler (ws natif, latency < 200ms, broadcasting manuel)
```

**État en Mémoire :**
- Par room, garbage collection si vide > 30 min
- Pas de persistance (parties éphémères, pas de stats historiques requises)
- Logs structurés Pino 10.1 pour debug production

**WebSocket natif vs Socket.io :**
- **ws natif (choisi)** : Protocole standard, léger, latency minimale, contrôle total
- **Socket.io** : Overkill pour ce cas (10 joueurs, rooms simples, broadcasting basique)

**Impact** : Performance optimale pour temps réel, overhead minimal, TypeScript excellent, architecture clean

---

### AD-6: Per-Room Immutable Configuration

**Décision** : Configuration définie au lobby par le créateur, immutable après start de partie

**Options Évaluées :**

| Approche | Avantages | Inconvénients | Flexibilité | Cohérence |
|----------|-----------|---------------|-------------|-----------|
| **Config par room (immutable)** | Cohérence garantie, prévisibilité | Pas d'ajustement mid-game | Moyenne | Excellente |
| **Config globale modifiable** | Flexibilité maximale | Risque incohérences mid-game | Élevée | Pauvre |
| **Config hybride** | Mix des deux | Complexité accrue | Élevée | Moyenne |

**Rationale** :
- **Évite incohérences** : Modifier durée bataille mid-game créerait bugs/confusion
- **Permet expérimentation** : Créateur peut tester différents paramètres entre parties
- **Prévisibilité** : Joueurs connaissent les règles fixes pour toute la partie

**Configuration Structure :**
```json
{
  "battleDuration": 30,           // Durée bataille en secondes
  "cooldownBetweenActions": 10,   // Cooldown entre actions
  "forceMultiplier": 0.7,         // Multiplicateur messages dans formule
  "territoryBonusRange": [1.0, 2.5] // Range bonus territoire (petit à grand)
}
```

**Workflow :**
1. **Lobby** : Créateur ajuste config via UI
2. **Start** : Config frozen et attachée à la room
3. **Mid-game** : Config immutable (pas de modifications possibles)
4. **Nouvelle partie** : Nouvelles valeurs utilisables

**Config Globale (séparée) :**
- Paramètres non-gameplay (logs level, reconnexion IRC timeout, etc.)
- Rechargeable via signal USR1 sans restart serveur
- N'affecte pas parties en cours

**Impact** : Cohérence gameplay garantie, expérimentation facile entre parties, pas de bugs mid-game

---

## Starter Template Evaluation

### Primary Technology Domain

**Web App Full-Stack** (SPA temps réel + Backend WebSocket + Intégration Twitch IRC) basé sur l'analyse des exigences projet.

### Technical Preferences Established

**Languages & Frameworks :**
- **TypeScript 5.6+** - Pour frontend et backend (type safety, maintenabilité)
- **Vue 3.5** - Frontend framework (décision AD-4)
- **Fastify 5.6** - Backend framework (performance + TypeScript natif)
- **Tailwind CSS 4.1** - Solution styling (utility-first, rapide)

**Architecture & Organization :**
- **Monorepo** - Frontend + Backend dans même projet
- **npm workspaces** - Gestion dépendances centralisée
- **Shared types** - Types TypeScript partagés entre frontend/backend

**Deployment :**
- **Docker Compose** - Orchestration services dev + production
- **Multi-stage builds** - Optimisation images Docker

### Starter Options Considered

**Options Évaluées :**

1. **Starters Full-Stack Monorepo Existants**
   - MajorLift/typescript-fullstack-monorepo-starter - React + Express + Docker Compose
   - Zenoo/fullstack-typescript-monorepo - React + Express + NPM workspaces

   **Problème** : Tous utilisent React (pas Vue 3), nécessiteraient remplacement complet du frontend

2. **Vite Template Vue + TypeScript (Frontend uniquement)**
   - `npm create vite@latest -- --template vue-ts`
   - Excellent pour frontend, mais nécessite setup backend séparé

3. **Setup Manuel Structuré (Recommandé)**
   - Control total sur stack exact
   - Pas de code inutile à supprimer
   - Optimisé pour besoins spécifiques du projet

**Décision** : Setup manuel structuré avec initialisation progressive

### Selected Approach: Manual Structured Setup

**Rationale for Selection :**

Aucun starter mature existant ne combine exactement Vue 3.5 + Fastify 5.6 + TypeScript + Docker Compose en monorepo. Les starters disponibles utilisent React + Express, ce qui nécessiterait autant de travail que de partir d'un setup propre.

**Avantages du setup manuel :**
- ✅ **Stack exacte souhaitée** - Vue 3.5 + Fastify 5.6 + WebSocket natif
- ✅ **Versions latest** - Tailwind 4.1, Vite 7.2, Pinia 3, Pino 10.1
- ✅ **Pas de code superflu** - Zéro dépendances React/Express à nettoyer
- ✅ **Optimisé pour le use case** - Architecture pensée pour jeu temps réel
- ✅ **Apprentissage complet** - Compréhension totale de chaque couche
- ✅ **Flexibilité maximale** - Ajustement facile selon besoins

**Project Structure :**

```
conflict-of-streamers/
├── package.json                 # Root avec npm workspaces
├── docker-compose.yml           # Dev + Prod services orchestration
├── .dockerignore
├── .gitignore
│
├── frontend/                    # Vue 3.5 + Vite 7.2 + TypeScript + Tailwind 4.1
│   ├── Dockerfile              # Multi-stage: build + nginx serve
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts      # Tailwind 4.1 config
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── router/             # Vue Router 4 configuration
│       │   └── index.ts
│       ├── views/              # Home.vue, Lobby.vue, Game.vue, Victory.vue
│       ├── components/         # UI components réutilisables
│       │   ├── game/          # GameMap, BattleProgress, ChatFeed, etc.
│       │   └── ui/            # Button, Card, Input, etc.
│       ├── composables/        # useWebSocket, useAudio, useGameState
│       ├── stores/             # Pinia 3 stores (game, lobby, player)
│       ├── services/           # WebSocket client, API calls
│       ├── lib/                # Utils, helpers, constants
│       ├── types/              # Frontend types locaux
│       └── assets/             # Audio files, images, CSS
│
├── backend/                     # Fastify 5.6 + TypeScript + WebSocket natif
│   ├── Dockerfile              # Multi-stage: build + run
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts           # Fastify app + WebSocket setup
│       ├── config/
│       │   └── index.ts       # Configuration loader (per-room config)
│       ├── managers/
│       │   ├── RoomManager.ts  # Room lifecycle, TTL, garbage collection
│       │   ├── GameEngine.ts   # Combat resolution, state machine
│       │   └── TwitchManager.ts # tmi.js integration, IRC reconnection
│       ├── routes/
│       │   ├── health.ts      # Health check endpoint
│       │   └── game.ts        # REST API routes (create room, join, etc.)
│       ├── websocket/
│       │   ├── handler.ts     # WebSocket connection handler
│       │   ├── events.ts      # Event handlers (attack, defend, etc.)
│       │   └── broadcast.ts   # Broadcasting utilities
│       ├── models/
│       │   ├── Game.ts         # Game state model
│       │   ├── Player.ts       # Player model
│       │   ├── Territory.ts    # Territory model with stats
│       │   └── Battle.ts       # Battle resolution model
│       └── utils/
│           ├── logger.ts      # Pino 10.1 logger configuration
│           └── validators.ts  # Input validation helpers
│
└── shared/                      # Types partagés frontend/backend
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── types/
            ├── game.ts         # Game, GameState, GameConfig
            ├── player.ts       # Player, PlayerStatus
            ├── territory.ts    # Territory, TerritoryStats
            ├── battle.ts       # Battle, BattleResult, BattleStats
            └── events.ts       # WebSocket event types (client ↔ server)
```

### Initialization Commands

**Step 1: Root Monorepo Setup**

```bash
# Initialize root package.json
npm init -y

# Configure npm workspaces - Edit package.json
```

**Root package.json :**
```json
{
  "name": "conflict-of-streamers",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend",
    "shared"
  ],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=frontend",
    "dev:backend": "npm run dev --workspace=backend",
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "build:frontend": "npm run build --workspace=frontend",
    "build:backend": "npm run build --workspace=backend",
    "build": "npm run build --workspaces",
    "docker:dev": "docker-compose up",
    "docker:build": "docker-compose build",
    "docker:prod": "docker-compose -f docker-compose.prod.yml up"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

**Step 2: Frontend Setup (Vue 3.5 + Vite 7.2 + TypeScript)**

```bash
# Create Vue 3 + TypeScript project with Vite 7.2
npm create vite@latest frontend -- --template vue-ts

cd frontend

# Install Tailwind CSS 4.1 + dependencies
npm install -D tailwindcss@^4.1 postcss autoprefixer
npx tailwindcss init -p

# Install Vue ecosystem
npm install vue@^3.5 vue-router@^4.4 pinia@^3.0

# Install WebSocket client (ws natif compatible)
npm install ws@^8.18
npm install -D @types/ws

# Install audio library
npm install howler@^2.2
npm install -D @types/howler

# Install Vite 7.2
npm install -D vite@^7.2
```

**Frontend package.json :**
```json
{
  "name": "frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.0",
    "vue-router": "^4.4.0",
    "pinia": "^3.0.0",
    "ws": "^8.18.0",
    "howler": "^2.2.0",
    "shared": "file:../shared"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.0",
    "typescript": "^5.6.0",
    "vite": "^7.2.0",
    "vue-tsc": "^2.2.0",
    "tailwindcss": "^4.1.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@types/ws": "^8.5.0",
    "@types/howler": "^2.2.0"
  }
}
```

**Tailwind Configuration (frontend/tailwind.config.ts) - Tailwind 4.1 format :**
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Couleurs optimisées pour streaming (contrastes forts)
      colors: {
        primary: {
          DEFAULT: '#FF6B35',
          dark: '#E55A2B',
          light: '#FF8255',
        },
        secondary: {
          DEFAULT: '#004E89',
          dark: '#003A66',
          light: '#0062AB',
        },
        accent: '#F7B801',
        success: '#06D6A0',
        danger: '#EF476F',
        dark: {
          DEFAULT: '#1A1A1A',
          lighter: '#2D2D2D',
        }
      },
      // Textes minimum 18px pour streaming (requirement PRD)
      fontSize: {
        'stream-sm': '18px',
        'stream-base': '20px',
        'stream-lg': '24px',
        'stream-xl': '28px',
      }
    },
  },
  plugins: [],
} satisfies Config
```

**Vite Configuration (frontend/vite.config.ts) :**
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  }
})
```

**Step 3: Backend Setup (Fastify 5.6 + TypeScript + WebSocket natif)**

```bash
# Create backend directory
mkdir -p backend/src
cd backend

# Initialize package.json
npm init -y

# Install Fastify 5.6 + plugins
npm install fastify@^5.6 @fastify/cors@^10.0 @fastify/websocket@^11.2

# Install Twitch IRC
npm install tmi.js@^1.8
npm install -D @types/tmi.js

# Pino 10.1 logging (déjà inclus avec Fastify 5.6, mais on force la version)
npm install pino@^10.1

# Install TypeScript tooling
npm install -D typescript@^5.6 @types/node tsx
npx tsc --init

# Install development tools
npm install -D nodemon concurrently

# Add reference to shared types
npm install shared@file:../shared
```

**Backend package.json :**
```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "fastify": "^5.6.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/websocket": "^11.2.0",
    "tmi.js": "^1.8.0",
    "pino": "^10.1.0",
    "shared": "file:../shared"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/tmi.js": "^1.8.0",
    "tsx": "^4.19.0",
    "nodemon": "^3.1.0"
  }
}
```

**Backend tsconfig.json :**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "paths": {
      "shared/*": ["../shared/src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Backend server.ts skeleton :**
```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'

const fastify = Fastify({
  logger: {
    level: 'info',
    // Pino 10.1 configuration
  }
})

// Plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
})

await fastify.register(websocket)

// Routes
fastify.get('/health', async () => ({ status: 'ok' }))

// WebSocket route
fastify.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    socket.on('message', (message) => {
      // Handle WebSocket messages
    })
  })
})

const start = async () => {
  try {
    await fastify.listen({
      port: Number(process.env.PORT) || 3000,
      host: '0.0.0.0'
    })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
```

**Step 4: Shared Types Setup**

```bash
# Create shared directory
mkdir -p shared/src/types
cd shared

# Initialize package.json
npm init -y

# Install TypeScript
npm install -D typescript@^5.6
npx tsc --init
```

**Shared package.json :**
```json
{
  "name": "shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**Shared tsconfig.json :**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 5: Docker Setup**

**Root docker-compose.yml (Development) :**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
      target: development
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3000
      - VITE_WS_URL=ws://localhost:3000
    volumes:
      - ./frontend:/app/frontend
      - ./shared:/app/shared
      - /app/frontend/node_modules
    command: npm run dev --workspace=frontend
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
      target: development
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - CORS_ORIGIN=http://localhost:5173
    volumes:
      - ./backend:/app/backend
      - ./shared:/app/shared
      - /app/backend/node_modules
    command: npm run dev --workspace=backend
```

**Root docker-compose.prod.yml (Production) :**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
      target: production
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://your-domain.com
      - VITE_WS_URL=ws://your-domain.com
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - CORS_ORIGIN=http://your-domain.com
```

**Frontend Dockerfile (multi-stage) :**
```dockerfile
# Development stage
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/
RUN npm ci
COPY . .
CMD ["npm", "run", "dev", "--workspace=frontend"]

# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/
RUN npm ci
COPY frontend ./frontend
COPY shared ./shared
RUN npm run build --workspace=shared
RUN npm run build --workspace=frontend

# Production stage
FROM nginx:alpine AS production
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Frontend nginx.conf :**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # API proxy
    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Backend Dockerfile (multi-stage) :**
```dockerfile
# Development stage
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/
RUN npm ci
COPY . .
CMD ["npm", "run", "dev", "--workspace=backend"]

# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/
RUN npm ci
COPY backend ./backend
COPY shared ./shared
RUN npm run build --workspace=shared
RUN npm run build --workspace=backend

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/shared/node_modules ./shared/node_modules
COPY backend/package*.json ./backend/
EXPOSE 3000
CMD ["node", "backend/dist/server.js"]
```

**Root .dockerignore :**
```
node_modules
dist
.git
.env
*.log
.DS_Store
_bmad
_bmad-output
_archive
.claude
.codex
```

### Architectural Decisions Provided by Setup

**Language & Runtime :**
- **TypeScript 5.6+** pour frontend, backend, et shared types
- **Node.js 20 LTS** (runtime backend, compatibilité Fastify 5.6)
- **Strict mode TypeScript** activé pour type safety maximale
- **ES Modules (ESM)** pour imports modernes

**Frontend Stack (Versions Exactes) :**
- **Vue 3.5** avec Composition API (réactivité native)
- **Vite 7.2** pour build ultra-rapide (HMR instantané)
- **Pinia 3** pour state management (successor de Vuex)
- **Vue Router 4.4** pour navigation SPA
- **Tailwind CSS 4.1** pour styling utility-first
- **ws 8.18** pour WebSocket natif (client)
- **Howler.js 2.2** pour audio orchestral + SFX

**Backend Stack (Versions Exactes) :**
- **Fastify 5.6** (2x plus rapide qu'Express, TypeScript natif)
- **@fastify/websocket 11.2** pour WebSocket natif (protocole ws://)
- **@fastify/cors 10.0** pour configuration CORS
- **tmi.js 1.8** pour intégration Twitch IRC
- **Pino 10.1** logging (ultra performant, intégré Fastify)

**Build Tooling :**
- **Vite 7.2** pour frontend (ESBuild compilation rapide)
- **TypeScript Compiler (tsc) 5.6** pour backend + shared
- **tsx** pour dev avec TypeScript direct (pas de compilation)
- **Docker multi-stage builds** pour images production optimisées
- **nginx alpine** pour servir frontend en production

**Code Organization :**
- **Monorepo npm workspaces** - gestion dépendances centralisée
- **Shared types package** - synchronisation types frontend/backend
- **Feature-based structure** - managers, services, stores organisés par domaine
- **Separation of concerns** - routes, websocket, models séparés

**Development Experience :**
- **Hot Module Replacement (HMR)** - Vite 7.2 pour frontend
- **Watch mode** - tsx watch pour backend (pas de restart manuel)
- **TypeScript IntelliSense** - Autocomplétion complète via tsconfig paths
- **Concurrently** - dev frontend + backend simultané
- **Docker Compose** - environnement dev isolé et reproductible

**WebSocket Architecture :**
- **Protocole natif ws://** (plus léger que Socket.io)
- **fastify-websocket 11.2** côté serveur
- **ws 8.18** côté client
- **Broadcasting manuel** (simple map des connections par room)
- **Latency optimale** < 200ms (pas d'overhead Socket.io)

**Testing Infrastructure (à configurer plus tard) :**
- **Frontend** : Vitest (intégré Vite) + Vue Test Utils
- **Backend** : Vitest ou Jest
- **E2E** : Playwright (recommendation selon PRD)

**Project Initialization Workflow :**

1. **Create root monorepo** : `npm init` + configure workspaces
2. **Initialize frontend** : `npm create vite` avec template vue-ts
3. **Initialize backend** : Setup manuel Fastify + TypeScript
4. **Initialize shared** : Package types TypeScript
5. **Install dependencies** : `npm install` depuis root (installe tous workspaces)
6. **Configure Tailwind 4.1** : Setup dans frontend
7. **Setup Docker** : docker-compose.yml + Dockerfiles multi-stage
8. **Configure TypeScript** : tsconfig.json pour chaque workspace avec paths
9. **Setup linting** : ESLint + Prettier (optionnel mais recommandé)
10. **Verify setup** : `npm run dev` doit lancer frontend + backend

**Note :** L'initialisation complète du projet doit être la **première story d'implémentation**, incluant :
- ✅ Structure monorepo complète avec npm workspaces
- ✅ Configuration Docker Compose dev + prod fonctionnelle
- ✅ Hello World frontend (Vue 3.5) connecté à backend (Fastify 5.6)
- ✅ WebSocket connection test basique (ws natif)
- ✅ Tailwind CSS 4.1 vérifié fonctionnel
- ✅ Shared types importés correctement côté frontend + backend
- ✅ Hot reload frontend + backend fonctionnels
- ✅ Build production Docker images testées

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

1. **Data Validation Strategy**: Zod for runtime validation + TypeScript type inference
2. **Error Handling Pattern**: Custom typed error classes hierarchy
3. **API Communication**: REST endpoints for non-realtime + WebSocket for gameplay
4. **State Management Architecture**: Domain-based Pinia stores
5. **Routing Strategy**: Vue Router History Mode
6. **WebSocket Event System**: Strongly-typed event-based architecture

**Important Decisions (Shape Architecture):**

7. **Environment Configuration**: .env files + Docker environment variables
8. **Logging Infrastructure**: Structured Pino logging with environment-based levels
9. **Deployment Strategy**: Manual Docker Compose deployment (no CI/CD for MVP)
10. **Monitoring Approach**: Health endpoint + structured logs

**Deferred Decisions (Post-MVP):**

- **Automated Testing**: Vitest + Playwright setup (defer until core gameplay implemented)
- **CI/CD Pipeline**: GitHub Actions (manual deploy sufficient for private 10-user app)
- **Advanced Monitoring**: Prometheus/Grafana (health endpoint + logs sufficient for MVP)

**Rationale for Deferral**: Focus on core gameplay delivery for collectif testing. Monitoring via logs is sufficient for 10 concurrent users. Testing and automation can be added based on feedback from initial sessions.

---

### Data Architecture

**AD-7: Zod for Data Validation**

**Decision**: Use Zod for runtime validation with shared schemas between frontend and backend

**Technology**:
- **Zod** `^3.23` (latest stable)
- Shared schemas in `shared/src/schemas/`

**Implementation Pattern**:
```typescript
// shared/src/schemas/player.ts
import { z } from 'zod'

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  pseudo: z.string().min(3).max(20),
  twitchUsername: z.string(),
  territoryIds: z.array(z.string()),
  status: z.enum(['waiting', 'ready', 'playing', 'eliminated'])
})

export type Player = z.infer<typeof PlayerSchema>

// Backend validation
const player = PlayerSchema.parse(data) // throws if invalid

// Frontend validation
const result = PlayerSchema.safeParse(data) // returns { success, data/error }
```

**Validation Locations**:
- **Frontend**: User input validation (UX feedback immédiat)
- **Backend**: API endpoints + WebSocket messages (sécurité)
- **Shared**: Types TypeScript automatiquement inférés

**Schemas Required**:
```
shared/src/schemas/
├── player.ts          // Player, PlayerStatus
├── game.ts            // Game, GameState, GameConfig
├── territory.ts       // Territory, TerritoryStats
├── battle.ts          // Battle, BattleResult
├── events.ts          // WebSocket event payloads
└── api.ts             // REST API request/response schemas
```

**Rationale**:
- Type safety end-to-end (compile-time + runtime)
- Single source of truth pour types partagés
- Excellent developer experience (autocomplete, errors clairs)
- Performance acceptable (<1ms validation per message)

**Impact**: Réduit bugs de communication frontend/backend, validation cohérente partout

---

### Error Handling & Security

**AD-8: Custom Typed Error Classes**

**Decision**: Implement custom error class hierarchy with Fastify global error handler

**Error Class Hierarchy**:
```typescript
// shared/src/errors/base.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

// shared/src/errors/index.ts
export class GameError extends AppError {
  constructor(message: string, details?: unknown) {
    super('GAME_ERROR', 400, message, details)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', 400, message, details)
  }
}

export class TwitchError extends AppError {
  constructor(message: string, details?: unknown) {
    super('TWITCH_ERROR', 503, message, details)
  }
}

export class WebSocketError extends AppError {
  constructor(message: string, details?: unknown) {
    super('WEBSOCKET_ERROR', 500, message, details)
  }
}
```

**Backend Error Handler**:
```typescript
// backend/src/utils/errorHandler.ts
fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    fastify.log.error({
      err: error,
      code: error.code,
      details: error.details
    })

    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    })
  }

  // Erreurs inattendues
  fastify.log.fatal(error)
  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Une erreur est survenue' }
  })
})
```

**Frontend Error Handling**:
```typescript
// Frontend catches errors and displays appropriate UI
try {
  await api.createRoom(data)
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    showValidationErrors(error.details)
  } else if (error.code === 'GAME_ERROR') {
    showGameErrorToast(error.message)
  } else {
    showGenericError()
  }
}
```

**Rationale**:
- Type-safe error handling
- Consistent error format frontend/backend
- Automatic Pino logging avec contexte
- Facilite debugging en production

**Impact**: Meilleur debugging, UX cohérente pour erreurs, logs structurés

---

### API & Communication Patterns

**AD-9: REST + WebSocket Hybrid Architecture**

**Decision**: REST for non-realtime operations, WebSocket native for realtime gameplay

**REST API Endpoints** (Fastify routes):
```typescript
// backend/src/routes/game.ts

// Create room
POST /api/rooms
Request: { creatorPseudo: string, config?: GameConfig }
Response: { roomCode: string, roomId: string }

// Join room
POST /api/rooms/:code/join
Request: { pseudo: string }
Response: { roomId: string, players: Player[] }

// Health check
GET /health
Response: { status: 'ok', uptime: number }
```

**WebSocket Events Architecture** (ws:// native):

**Client → Server Events**:
```typescript
// shared/src/types/events.ts
export type ClientToServerEvents = {
  'player:join': {
    roomCode: string
    pseudo: string
    twitchUsername: string
  }

  'territory:select': {
    territoryId: string
  }

  'action:attack': {
    targetTerritoryId: string
  }

  'action:defend': {
    territoryId: string
  }

  'player:ready': {}

  'player:disconnect': {}
}
```

**Server → Client Events**:
```typescript
export type ServerToClientEvents = {
  'lobby:update': {
    players: Player[]
    territoriesSelected: Record<string, string> // playerId → territoryId
  }

  'game:start': {
    gameState: GameState
  }

  'battle:start': {
    attackerId: string
    defenderId: string
    targetTerritoryId: string
    duration: number // ms
  }

  'battle:progress': {
    attackerForce: number
    defenderForce: number
    attackerMessages: number
    defenderMessages: number
    attackerUniqueUsers: number
    defenderUniqueUsers: number
  }

  'battle:result': {
    result: BattleResult
    winner: string
    topSpammers: { pseudo: string, messages: number }[]
    participationRate: number
  }

  'game:stateUpdate': {
    territories: Territory[]
    players: Player[]
  }

  'game:victory': {
    winnerId: string
    finalStats: GameStats
  }

  'error': {
    code: string
    message: string
  }
}
```

**WebSocket Handler Pattern**:
```typescript
// backend/src/websocket/handler.ts
fastify.get('/ws', { websocket: true }, (socket, req) => {
  const connectionId = generateId()

  socket.on('message', async (message) => {
    const { event, data } = JSON.parse(message.toString())

    // Validation avec Zod
    const eventSchema = ClientEventSchemas[event]
    const validatedData = eventSchema.parse(data)

    // Dispatch to event handler
    await eventHandlers[event](socket, validatedData, connectionId)
  })

  socket.on('close', () => {
    handleDisconnect(connectionId)
  })
})
```

**Rationale**:
- REST pour operations simples (create/join room)
- WebSocket pour tout le gameplay temps réel
- Type safety avec types partagés
- Validation Zod sur tous les events

**Impact**: Communication claire, type-safe, performante pour temps réel

---

### Frontend Architecture

**AD-10: Domain-Based Pinia Stores**

**Decision**: Organize Pinia 3 stores by functional domain

**Store Structure**:
```
frontend/src/stores/
├── gameStore.ts       // Global game state
├── lobbyStore.ts      // Lobby state
├── playerStore.ts     // Local player info
├── battleStore.ts     // Active battle state
└── websocketStore.ts  // WebSocket connection management
```

**Store Responsibilities**:

**gameStore.ts**:
```typescript
import { defineStore } from 'pinia'
import type { Game, Territory, Player } from 'shared/types'

export const useGameStore = defineStore('game', () => {
  const currentGame = ref<Game | null>(null)
  const territories = ref<Territory[]>([])
  const players = ref<Player[]>([])

  function updateGameState(state: GameState) {
    // Update reactive state
  }

  function getPlayerTerritories(playerId: string) {
    return territories.value.filter(t => t.ownerId === playerId)
  }

  return { currentGame, territories, players, updateGameState, getPlayerTerritories }
})
```

**websocketStore.ts**:
```typescript
export const useWebSocketStore = defineStore('websocket', () => {
  const ws = ref<WebSocket | null>(null)
  const connected = ref(false)

  function connect(url: string) {
    ws.value = new WebSocket(url)

    ws.value.onopen = () => { connected.value = true }
    ws.value.onclose = () => { connected.value = false }
    ws.value.onmessage = (event) => handleMessage(event)
  }

  function send<T extends keyof ClientToServerEvents>(
    event: T,
    data: ClientToServerEvents[T]
  ) {
    ws.value?.send(JSON.stringify({ event, data }))
  }

  function handleMessage(event: MessageEvent) {
    const { event: eventName, data } = JSON.parse(event.data)

    // Dispatch to appropriate store
    switch (eventName) {
      case 'lobby:update':
        useLobbyStore().updateLobby(data)
        break
      case 'battle:progress':
        useBattleStore().updateProgress(data)
        break
      // etc.
    }
  }

  return { connected, connect, send }
})
```

**Rationale**:
- Separation of concerns par domaine
- Stores peuvent communiquer entre eux
- Composition API Pinia (ref, computed, actions)
- WebSocket store centralise communication

**Impact**: Code organisé, maintenable, évolutif

---

**AD-11: Vue Router History Mode**

**Decision**: Use History Mode for clean URLs

**Routes Configuration**:
```typescript
// frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/lobby/:code?',
    name: 'Lobby',
    component: () => import('@/views/Lobby.vue'),
    props: true
  },
  {
    path: '/game/:code',
    name: 'Game',
    component: () => import('@/views/Game.vue'),
    props: true,
    meta: { requiresGame: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
  if (to.meta.requiresGame) {
    const gameStore = useGameStore()
    if (!gameStore.currentGame) {
      return next({ name: 'Home' })
    }
  }
  next()
})

export default router
```

**URL Structure**:
- `/` - Page d'accueil
- `/lobby` - Créer partie
- `/lobby/VENDETTA` - Rejoindre partie avec code
- `/game/VENDETTA` - Partie en cours

**Nginx Configuration** (already in place):
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Rationale**:
- URLs propres et partageables
- Code lobby dans URL facilite partage
- Nginx config déjà prête
- Meilleur pour UX

**Impact**: URLs propres, partage facile de liens lobby

---

### Infrastructure & Deployment

**AD-12: Environment Configuration Strategy**

**Decision**: Use .env files + Docker environment variables

**Environment Files Structure**:
```
frontend/
├── .env.development
└── .env.production

backend/
├── .env.development
└── .env.production
```

**Frontend .env.development**:
```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

**Frontend .env.production**:
```bash
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com
```

**Backend .env.development**:
```bash
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

**Backend .env.production**:
```bash
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=info
```

**Docker Compose Integration** (already configured):
```yaml
# docker-compose.yml uses .env.development values
# docker-compose.prod.yml uses .env.production values
```

**Rationale**:
- Standard approach (Vite + Node)
- Clear separation dev/prod
- Docker Compose override par environment
- Pas de secrets dans le code

**Impact**: Configuration flexible, sécurisée, facile à gérer

---

**AD-13: Structured Logging with Pino**

**Decision**: Use Pino 10.1 structured logging with environment-based levels

**Logging Configuration**:
```typescript
// backend/src/utils/logger.ts
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined
})

export default logger
```

**Fastify Integration** (already integrated):
```typescript
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
})
```

**Log Levels by Environment**:
- **Development**: `debug` (verbose, all events)
- **Production**: `info` (important events only)

**Critical Events to Log**:
```typescript
// Twitch IRC
logger.info({ channel: pseudo }, 'Connected to Twitch IRC')
logger.error({ channel: pseudo, err }, 'Twitch IRC connection failed')

// WebSocket
logger.debug({ connectionId }, 'WebSocket connection established')
logger.warn({ connectionId }, 'WebSocket disconnected')

// Game Events
logger.info({ roomCode, players }, 'Game started')
logger.info({ roomCode, winner }, 'Game ended')

// Battles
logger.debug({ battleId, attackerId, defenderId }, 'Battle started')
logger.info({ battleId, result }, 'Battle completed')

// Errors
logger.error({ err, context }, 'Error occurred')
logger.fatal({ err }, 'Fatal error - server crash')
```

**Log Format** (JSON structured):
```json
{
  "level": 30,
  "time": 1704672000000,
  "pid": 1234,
  "hostname": "server",
  "msg": "Game started",
  "roomCode": "VENDETTA",
  "players": 8
}
```

**Rationale**:
- Structured logs faciles à parser
- Environment-based verbosity
- Excellent performance Pino
- Fastify integration native

**Impact**: Debugging efficace, logs production exploitables

---

**AD-14: Manual Docker Compose Deployment**

**Decision**: Manual deployment via Docker Compose (no CI/CD for MVP)

**Deployment Process**:
```bash
# Sur le VPS
cd /path/to/conflict-of-streamers

# Pull latest code
git pull origin main

# Build and start production containers
docker-compose -f docker-compose.prod.yml up --build -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop containers
docker-compose -f docker-compose.prod.yml down
```

**Why Manual for MVP**:
- ✅ Simple et rapide à setup
- ✅ Suffisant pour collectif privé (10 utilisateurs)
- ✅ Pas de complexité GitHub Actions pour démarrer
- ✅ Deploy on-demand (pas besoin CI/CD pour tests internes)

**Future CI/CD** (post-MVP si nécessaire):
- GitHub Actions build + push Docker Hub
- Webhook VPS pour auto-deploy
- Defer jusqu'à besoin réel

**Rationale**:
- MVP focus sur gameplay, pas infrastructure
- Manual deploy OK pour private app
- Peut évoluer vers CI/CD plus tard

**Impact**: Déploiement simple, maintenance facile, focus sur features

---

**AD-15: Health Endpoint + Structured Logs Monitoring**

**Decision**: Health endpoint for uptime checks + Pino logs for debugging

**Health Endpoint**:
```typescript
// backend/src/routes/health.ts
fastify.get('/health', async () => {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: process.env.npm_package_version
  }
})
```

**Monitoring Strategy for MVP**:
- **Health Check**: Endpoint `/health` accessible publiquement
- **Logs**: Structured Pino logs pour investigation problèmes
- **Manual Check**: Vérification manuelle si besoin

**Optional (post-MVP)**:
- UptimeRobot gratuit ping `/health` toutes les 5 min
- Alertes email si down
- Defer si pas nécessaire pour MVP

**Rationale**:
- Health endpoint = baseline monitoring
- Logs suffisants pour debugging (10 joueurs simultanés)
- Pas besoin Prometheus/Grafana pour MVP
- Peut ajouter monitoring externe gratuitement plus tard

**Impact**: Monitoring simple, suffisant pour MVP, évolutif

---

### Decision Impact Analysis

**Implementation Sequence** (Order matters):

1. **Setup monorepo** (Step 3 - Starter Template)
2. **Configure Zod schemas** (shared/src/schemas/) → Bloque API + WebSocket
3. **Define WebSocket events** (shared/src/types/events.ts) → Bloque communication
4. **Create Error classes** (shared/src/errors/) → Bloque error handling
5. **Setup Pinia stores** (frontend/src/stores/) → Bloque state management
6. **Configure Vue Router** (frontend/src/router/) → Bloque navigation
7. **Implement REST endpoints** (backend/src/routes/) → Bloque room creation
8. **Implement WebSocket handler** (backend/src/websocket/) → Bloque gameplay
9. **Configure environment files** (.env.*) → Bloque deployment
10. **Setup Docker deployment** (docker-compose.prod.yml) → Bloque production

**Cross-Component Dependencies**:

- **Zod schemas** utilisés par : REST API, WebSocket events, Frontend forms, Backend validation
- **WebSocket events** utilisés par : websocketStore, Game managers, Frontend views
- **Error classes** utilisés par : Fastify error handler, Frontend error display, Pino logging
- **Pinia stores** utilisés par : Tous les composants Vue, WebSocket message handlers
- **Environment vars** utilisés par : Vite build, Fastify server, Docker Compose

**Critical Path**:
Shared types (Zod + Events) → Backend handlers → Frontend stores → Views

---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 26 areas where AI agents could make different choices without explicit patterns. These patterns ensure consistency across all implementations.

---

### 1. Naming Patterns

#### File Naming Convention

| File Type | Convention | Example | Anti-pattern |
|-----------|-----------|---------|--------------|
| Vue Components | PascalCase.vue | `GameMap.vue`, `BattleProgress.vue` | `gameMap.vue`, `game-map.vue` |
| TypeScript Files | camelCase.ts | `gameEngine.ts`, `websocketHandler.ts` | `GameEngine.ts`, `websocket-handler.ts` |
| Test Files | `{filename}.test.ts` | `gameEngine.test.ts` | `test.gameEngine.ts`, `gameEngineTest.ts` |
| Type Definition Files | camelCase.d.ts | `events.d.ts` | `Events.d.ts` |
| Zod Schema Files | camelCase.ts | `player.ts` (dans /schemas/) | `playerSchema.ts` |

**Why This Matters**: Vue ecosystem convention is PascalCase components. TypeScript/Node ecosystem prefers camelCase files. Mixing patterns creates confusion when importing.

---

#### Code Naming Convention

| Element Type | Convention | Example | Anti-pattern |
|--------------|-----------|---------|--------------|
| Variables | camelCase | `const gameState = ref()` | `const GameState`, `const game_state` |
| Functions | camelCase | `function calculateForce()` | `function CalculateForce()` |
| Constants | SCREAMING_SNAKE_CASE | `const MAX_PLAYERS = 10` | `const maxPlayers = 10` |
| Types/Interfaces | PascalCase | `type Player`, `interface GameState` | `type player`, `interface gameState` |
| Zod Schemas | PascalCase + "Schema" | `export const PlayerSchema = z.object()` | `playerSchema`, `Player_Schema` |
| Type Inferred from Zod | PascalCase (sans "Schema") | `export type Player = z.infer<typeof PlayerSchema>` | `type PlayerType` |
| Pinia Stores | camelCase avec "use" prefix | `useGameStore`, `useWebSocketStore` | `GameStore`, `gameStore` |
| Composables | camelCase avec "use" prefix | `useAudio`, `useWebSocket` | `audioComposable` |

**Example (Zod Schema Pattern)**:
```typescript
// ✅ CORRECT
import { z } from 'zod'

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  pseudo: z.string()
})

export type Player = z.infer<typeof PlayerSchema>

// Usage
const player = PlayerSchema.parse(data) // Runtime validation
const p: Player = { id: '...', pseudo: 'Sam' } // Type annotation

// ❌ INCORRECT
export const playerSchema = z.object({ ... }) // Pas PascalCase
export type PlayerType = z.infer<typeof PlayerSchema> // Suffixe inutile
```

---

#### WebSocket Event Naming

**Pattern**: `namespace:action` format

| Namespace | Actions | Examples |
|-----------|---------|----------|
| `player:` | join, ready, disconnect | `player:join`, `player:ready` |
| `territory:` | select, update | `territory:select` |
| `action:` | attack, defend | `action:attack`, `action:defend` |
| `battle:` | start, progress, result | `battle:start`, `battle:progress` |
| `game:` | start, stateUpdate, victory | `game:start`, `game:victory` |
| `lobby:` | update | `lobby:update` |
| `error` | (global, pas de namespace) | `error` |

**Why This Matters**: Prevents event name collisions, makes event purpose immediately clear, groups related events logically.

**Example**:
```typescript
// ✅ CORRECT
socket.send({ event: 'player:join', data: { ... } })
socket.send({ event: 'action:attack', data: { ... } })

// ❌ INCORRECT
socket.send({ event: 'join', data: { ... } }) // Ambiguous
socket.send({ event: 'playerJoin', data: { ... } }) // Pas le format namespace:action
socket.send({ event: 'attack_territory', data: { ... } }) // Snake_case
```

---

#### API Endpoint Naming

**Pattern**: REST conventions with French plural nouns where appropriate

| Endpoint | Convention | Example | Anti-pattern |
|----------|-----------|---------|--------------|
| Resource Collection | Pluriel, lowercase | `POST /api/rooms` | `/api/room`, `/api/createRoom` |
| Resource Item | Pluriel + ID | `GET /api/rooms/:code` | `/api/room/:code` |
| Actions | Verbe after resource | `POST /api/rooms/:code/join` | `/api/joinRoom/:code` |
| Query Params | camelCase | `?maxPlayers=10` | `?max_players=10` |
| Path Params | camelCase | `:roomCode` | `:room_code` |

**Example**:
```typescript
// ✅ CORRECT
POST /api/rooms
POST /api/rooms/:code/join
GET /health

// ❌ INCORRECT
POST /api/createRoom (verbe dans l'endpoint)
POST /api/room (singulier pour collection)
GET /api/rooms/:room_code (snake_case param)
```

---

### 2. Structure Patterns

#### Test File Co-location

**Pattern**: Tests are co-located with source files

```
backend/src/
├── managers/
│   ├── GameEngine.ts
│   ├── GameEngine.test.ts       ✅ Co-located
│   ├── RoomManager.ts
│   └── RoomManager.test.ts

frontend/src/
├── stores/
│   ├── gameStore.ts
│   ├── gameStore.test.ts        ✅ Co-located
│   ├── websocketStore.ts
│   └── websocketStore.test.ts
```

**Why This Matters**: Easier to find tests, encourages test creation, clear 1:1 relationship.

**Anti-pattern**:
```
// ❌ INCORRECT
backend/
├── src/
│   └── managers/
│       └── GameEngine.ts
└── tests/
    └── managers/
        └── GameEngine.test.ts   ❌ Séparé
```

---

#### Component Organization by Domain

**Pattern**: Group components by functional domain, not by type

```
frontend/src/components/
├── game/                        ✅ Domain-based
│   ├── GameMap.vue
│   ├── GameHeader.vue
│   ├── GameActionHistory.vue
│   └── GameLegend.vue
├── battle/
│   ├── BattleProgress.vue
│   ├── BattleSummary.vue
│   └── BattleSpammerList.vue
├── lobby/
│   ├── LobbyPlayerList.vue
│   ├── LobbyTerritoryPicker.vue
│   └── LobbyConfigPanel.vue
└── ui/                         ✅ Generic UI library
    ├── Button.vue
    ├── Card.vue
    └── Input.vue
```

**Why This Matters**: Components grouped by feature are easier to understand, modify, and navigate.

**Anti-pattern**:
```
// ❌ INCORRECT - Organization by type
components/
├── maps/
│   └── GameMap.vue
├── headers/
│   └── GameHeader.vue
├── progress/
│   └── BattleProgress.vue
└── lists/
    ├── LobbyPlayerList.vue
    └── BattleSpammerList.vue
```

---

#### Store Organization

**Pattern**: One file per store, stores organized by domain

```
frontend/src/stores/
├── gameStore.ts          ✅ One store per file
├── lobbyStore.ts
├── playerStore.ts
├── battleStore.ts
└── websocketStore.ts
```

**Store Responsibilities**:
- **gameStore**: Global game state (territories, players, game phase)
- **lobbyStore**: Lobby-specific state (waiting players, territory selections)
- **playerStore**: Local player info (current player pseudo, selected territory)
- **battleStore**: Active battle state (progress, spammers, results)
- **websocketStore**: WebSocket connection + message routing

**Why This Matters**: Clear separation of concerns, avoids megastore antipattern.

**Anti-pattern**:
```typescript
// ❌ INCORRECT - Tout dans un seul store
export const useAppStore = defineStore('app', () => {
  const game = ref()
  const lobby = ref()
  const player = ref()
  const battle = ref()
  const ws = ref()
  // ... 500 lignes de code
})
```

---

### 3. Format Patterns

#### API Response Format

**Pattern**: Direct data responses, no wrapper envelope for success cases

```typescript
// ✅ CORRECT - Success responses
POST /api/rooms
Response 201:
{
  "roomCode": "VENDETTA",
  "roomId": "uuid-here"
}

// ✅ CORRECT - Error responses
Response 400:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Le pseudo doit faire entre 3 et 20 caractères",
    "details": { field: "pseudo", value: "ab" }
  }
}

// ❌ INCORRECT - Wrapped responses
{
  "success": true,
  "data": { roomCode: "VENDETTA" }
}
```

**Why This Matters**: Simpler client code, standard HTTP semantics (status code = success/error).

---

#### JSON Key Casing

**Pattern**: camelCase for all JSON keys (API + WebSocket)

```typescript
// ✅ CORRECT
{
  "playerId": "uuid",
  "twitchUsername": "SamStreamer",
  "territoryIds": ["T1", "T2"]
}

// ❌ INCORRECT
{
  "player_id": "uuid",           // Snake_case
  "TwitchUsername": "SamStreamer" // PascalCase
}
```

**Why This Matters**: Consistency with JavaScript conventions, direct mapping to TypeScript types.

---

#### Date/Time Format

**Pattern**: ISO 8601 strings for all dates

```typescript
// ✅ CORRECT
{
  "battleStartTime": "2026-01-07T18:30:00.000Z",
  "createdAt": "2026-01-07T18:25:15.123Z"
}

// ❌ INCORRECT
{
  "battleStartTime": 1704652200000,        // Unix timestamp
  "createdAt": "07/01/2026 18:25:15"       // Custom format
}
```

**Why This Matters**: Standard format, timezone-aware, parseable by `new Date()`.

---

#### WebSocket Message Format

**Pattern**: `{ event, data }` structure for all WebSocket messages

```typescript
// ✅ CORRECT - Client → Server
{
  "event": "action:attack",
  "data": {
    "targetTerritoryId": "T15"
  }
}

// ✅ CORRECT - Server → Client
{
  "event": "battle:progress",
  "data": {
    "attackerForce": 150,
    "defenderForce": 120
  }
}

// ❌ INCORRECT
{
  "type": "attack",              // Pas "event"
  "payload": { ... }             // Pas "data"
}
```

**Why This Matters**: Consistent structure for event routing, easy to validate with Zod.

---

### 4. Communication Patterns

#### State Updates (Pinia)

**Pattern**: Always use immutable updates for arrays and objects

```typescript
// ✅ CORRECT - Immutable updates
export const useGameStore = defineStore('game', () => {
  const territories = ref<Territory[]>([])

  function addTerritory(territory: Territory) {
    territories.value = [...territories.value, territory]
  }

  function updateTerritory(id: string, updates: Partial<Territory>) {
    territories.value = territories.value.map(t =>
      t.id === id ? { ...t, ...updates } : t
    )
  }

  function removeTerritory(id: string) {
    territories.value = territories.value.filter(t => t.id !== id)
  }

  return { territories, addTerritory, updateTerritory, removeTerritory }
})

// ❌ INCORRECT - Mutable updates
function addTerritory(territory: Territory) {
  territories.value.push(territory)  // Mutation directe
}

function updateTerritory(id: string, updates: Partial<Territory>) {
  const t = territories.value.find(t => t.id === id)
  Object.assign(t, updates)  // Mutation directe
}
```

**Why This Matters**: Vue 3 reactivity fonctionne mieux avec immutabilité, évite bugs subtils, facilite debugging.

---

#### Logging Levels

**Pattern**: Use appropriate Pino log levels consistently

| Level | Usage | Example |
|-------|-------|---------|
| `debug` | Development details, verbose events | `logger.debug({ connectionId }, 'WebSocket message received')` |
| `info` | Important business events | `logger.info({ roomCode, players }, 'Game started')` |
| `warn` | Recoverable errors, warnings | `logger.warn({ channel }, 'Twitch IRC reconnecting')` |
| `error` | Errors requiring attention | `logger.error({ err, roomCode }, 'Battle calculation failed')` |
| `fatal` | Critical errors causing crash | `logger.fatal({ err }, 'Server startup failed')` |

**Example**:
```typescript
// ✅ CORRECT
// Development: debug = verbose
logger.debug({ event: 'action:attack', data }, 'WebSocket event received')

// Production: info = important only
logger.info({ roomCode, winner, duration }, 'Game completed')

// Always log errors
logger.error({ err, context: { roomCode, playerId } }, 'Failed to process attack')

// ❌ INCORRECT
logger.info({ message: 'some event' })  // Pas de contexte
console.log('Game started')  // Pas Pino logger
logger.error('Error')  // Pas d'objet erreur
```

**Why This Matters**: Consistent log levels = easy filtering in production, structured data = easy parsing.

---

### 5. Process Patterns

#### Error Handling Pattern

**Pattern**: Try/catch with custom error classes + logging

```typescript
// ✅ CORRECT - Backend
import { GameError, ValidationError } from 'shared/errors'

async function handleAttack(data: unknown) {
  try {
    // Validate input
    const validated = AttackEventSchema.parse(data)

    // Business logic
    const result = await gameEngine.processAttack(validated)

    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid attack data', error.errors)
    }

    if (error instanceof GameError) {
      logger.warn({ err: error }, 'Attack failed (expected)')
      throw error
    }

    // Unexpected error
    logger.error({ err: error }, 'Unexpected error in handleAttack')
    throw new GameError('Attack processing failed')
  }
}

// ✅ CORRECT - Frontend
async function attackTerritory(targetId: string) {
  try {
    const result = await api.attack(targetId)
    showSuccessToast('Attaque lancée!')
    return result
  } catch (error) {
    if (error.code === 'GAME_ERROR') {
      showErrorToast(error.message)
    } else if (error.code === 'VALIDATION_ERROR') {
      showValidationErrors(error.details)
    } else {
      showErrorToast('Une erreur est survenue')
      logger.error({ err: error }, 'Unexpected error in attackTerritory')
    }
  }
}

// ❌ INCORRECT
function handleAttack(data: unknown) {
  const result = gameEngine.processAttack(data)  // No validation, no try/catch
  return result
}

async function attackTerritory(targetId: string) {
  const result = await api.attack(targetId)  // No error handling
}
```

**Why This Matters**: Consistent error handling, better UX (user feedback), easier debugging.

---

#### Loading State Pattern

**Pattern**: Boolean `isLoading` flags in components/stores

```typescript
// ✅ CORRECT - Component
<script setup lang="ts">
const isCreatingRoom = ref(false)

async function createRoom() {
  isCreatingRoom.value = true
  try {
    const room = await api.createRoom(config)
    router.push(`/lobby/${room.roomCode}`)
  } catch (error) {
    handleError(error)
  } finally {
    isCreatingRoom.value = false
  }
}
</script>

<template>
  <button :disabled="isCreatingRoom" @click="createRoom">
    {{ isCreatingRoom ? 'Création...' : 'Créer partie' }}
  </button>
</template>

// ✅ CORRECT - Store
export const useGameStore = defineStore('game', () => {
  const isLoadingGame = ref(false)

  async function loadGame(code: string) {
    isLoadingGame.value = true
    try {
      const game = await api.getGame(code)
      currentGame.value = game
    } finally {
      isLoadingGame.value = false
    }
  }

  return { isLoadingGame, loadGame }
})

// ❌ INCORRECT
const loading = ref('idle') // String state instead of boolean
const status = ref<'loading' | 'success' | 'error'>('idle') // Over-engineered for simple case
```

**Why This Matters**: Simple, predictable loading states, better UX (disable buttons, show spinners).

---

#### Validation Pattern

**Pattern**: Client-side validation first (UX), server-side validation always (security)

```typescript
// ✅ CORRECT - Client validates for UX
async function joinRoom() {
  // Client validation (immediate feedback)
  const validationResult = JoinRoomSchema.safeParse({
    pseudo: pseudo.value,
    roomCode: code.value
  })

  if (!validationResult.success) {
    showValidationErrors(validationResult.error)
    return
  }

  // Server call (will re-validate)
  try {
    const result = await api.joinRoom(validationResult.data)
    // ...
  } catch (error) {
    handleError(error)
  }
}

// ✅ CORRECT - Server ALWAYS validates
fastify.post('/api/rooms/:code/join', async (request, reply) => {
  // NEVER trust client data
  const validated = JoinRoomSchema.parse(request.body)

  const result = await roomManager.joinRoom(request.params.code, validated)
  return result
})

// ❌ INCORRECT - Server trusts client
fastify.post('/api/rooms/:code/join', async (request, reply) => {
  // No validation - SECURITY ISSUE
  const result = await roomManager.joinRoom(request.params.code, request.body)
  return result
})
```

**Why This Matters**: Client validation = better UX (instant feedback). Server validation = security (never trust client).

---

### 6. Enforcement Guidelines

#### For AI Agents Implementing Features

**Before Writing Code**:
1. ✅ Check this patterns document for relevant conventions
2. ✅ Review existing similar code for consistency
3. ✅ Use shared Zod schemas from `shared/src/schemas/`
4. ✅ Import types from `shared/src/types/`
5. ✅ Follow error handling patterns

**During Implementation**:
1. ✅ Name files according to convention (PascalCase .vue, camelCase .ts)
2. ✅ Use appropriate log levels (debug in dev, info in prod)
3. ✅ Validate input with Zod schemas
4. ✅ Handle errors with custom error classes
5. ✅ Update state immutably in Pinia stores

**After Implementation**:
1. ✅ Verify naming conventions match this document
2. ✅ Ensure WebSocket events use `namespace:action` format
3. ✅ Check API endpoints follow REST conventions
4. ✅ Confirm error handling uses try/catch + custom errors
5. ✅ Test loading states work correctly

---

### 7. Pattern Checklist for AI Agents

When implementing a new feature, verify:

- [ ] **File names** follow convention (PascalCase .vue, camelCase .ts)
- [ ] **Variables/functions** are camelCase, **Types** are PascalCase
- [ ] **Zod schemas** are PascalCase + "Schema" suffix
- [ ] **WebSocket events** use `namespace:action` format
- [ ] **API endpoints** use REST conventions (plural resources)
- [ ] **Tests** are co-located with source files
- [ ] **Components** are organized by domain (game/, battle/, lobby/)
- [ ] **JSON keys** are camelCase
- [ ] **Dates** are ISO 8601 format
- [ ] **State updates** are immutable (Pinia stores)
- [ ] **Error handling** uses try/catch + custom error classes
- [ ] **Loading states** use boolean `isLoading` flags
- [ ] **Validation** happens client-side (UX) AND server-side (security)
- [ ] **Logging** uses appropriate Pino levels with structured context

---

### 8. Good Examples vs Anti-patterns Summary

| Category | ✅ Good Example | ❌ Anti-pattern |
|----------|----------------|-----------------|
| Vue Component | `GameMap.vue` | `gameMap.vue`, `game-map.vue` |
| TypeScript File | `gameEngine.ts` | `GameEngine.ts` |
| Zod Schema | `export const PlayerSchema = z.object()` | `export const playerSchema` |
| Type from Zod | `export type Player = z.infer<typeof PlayerSchema>` | `export type PlayerType` |
| WebSocket Event | `socket.send({ event: 'player:join', data })` | `socket.send({ type: 'join' })` |
| API Endpoint | `POST /api/rooms` | `POST /api/createRoom` |
| Store Update | `territories.value = [...territories.value, newT]` | `territories.value.push(newT)` |
| Error Handling | `try/catch + throw new GameError()` | `try/catch + return null` |
| Loading State | `const isLoading = ref(false)` | `const status = ref('idle')` |
| Validation | Client + Server validation | Server only or Client only |

---

**Pattern Compliance**: All AI agents implementing features MUST follow these patterns. Deviation requires explicit architectural decision update.

---

## Project Structure & Boundaries

### Complete Project Directory Structure

Le projet suit une architecture **monorepo npm workspaces** avec trois packages principaux : `frontend/` (Vue 3.5 + Vite 7.2), `backend/` (Fastify 5.6 + WebSocket natif), et `shared/` (types TypeScript + schemas Zod partagés).

```
conflict-of-streamers/
├── README.md
├── package.json                           # Root monorepo avec workspaces
├── package-lock.json
├── docker-compose.yml                     # Dev environment orchestration
├── docker-compose.prod.yml                # Production deployment
├── .dockerignore
├── .gitignore
├── .env.example
│
├── frontend/                              # Vue 3.5 + Vite 7.2 + TypeScript
│   ├── Dockerfile                         # Multi-stage: dev + build + nginx
│   ├── nginx.conf                         # Production nginx config
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts                     # Vite 7.2 avec proxy WebSocket
│   ├── tailwind.config.ts                 # Tailwind 4.1 streaming-optimized
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── index.html
│   ├── .env.development
│   ├── .env.production
│   │
│   ├── public/                            # Static assets
│   │   ├── favicon.ico
│   │   ├── audio/
│   │   │   ├── theme.mp3                  # FR44: Musique orchestrale lobby
│   │   │   ├── war_theme.mp3              # FR45: Musique bataille
│   │   │   ├── war_horn.mp3               # FR46: SFX attaque
│   │   │   └── victory.mp3                # FR47: SFX victoire
│   │   └── images/
│   │       └── world-map-placeholder.svg
│   │
│   └── src/
│       ├── main.ts                        # Vue app entry point
│       ├── App.vue                        # Root component
│       ├── style.css                      # Global Tailwind imports
│       │
│       ├── router/                        # Vue Router 4.4 (History Mode)
│       │   └── index.ts                   # Routes: /, /lobby/:code?, /game/:code
│       │
│       ├── views/                         # Page-level components
│       │   ├── Home.vue                   # FR1, FR50: Page accueil + tutoriel
│       │   ├── Lobby.vue                  # FR7-FR11: Lobby & pre-game
│       │   ├── Game.vue                   # FR17-FR29: Main game view
│       │   └── Victory.vue                # FR34-FR37: Victory screen
│       │
│       ├── components/                    # Domain-organized components
│       │   ├── lobby/
│       │   │   ├── LobbyPlayerList.vue    # FR7: Liste joueurs en attente
│       │   │   ├── LobbyTerritoryPicker.vue # FR9: Sélection territoire sur grille
│       │   │   ├── LobbyConfigPanel.vue   # FR2-FR5: Config durée/cooldown/params
│       │   │   └── LobbyInstructions.vue  # FR11: Instructions intégrées
│       │   │
│       │   ├── game/
│       │   │   ├── GameMap.vue            # FR25-FR29: Canvas 2D grille 20×20
│       │   │   ├── GameHeader.vue         # Header avec room code, joueurs
│       │   │   ├── GameActionHistory.vue  # FR52: Historique actions (toast feed)
│       │   │   ├── GameScoreboardOverlay.vue # FR50: Leaderboard touche Tab
│       │   │   ├── GameLegend.vue         # Légende couleurs joueurs
│       │   │   ├── GameCommandPanel.vue   # Panel commandes joueur
│       │   │   └── GameWinnerDialog.vue   # FR34: Dialog victoire
│       │   │
│       │   ├── battle/
│       │   │   ├── BattleProgress.vue     # FR25-FR26: Barres progression temps réel
│       │   │   ├── BattleSummary.vue      # FR30-FR31: Résumé post-bataille
│       │   │   └── BattleSpammerList.vue  # FR32: Top 5 spammers + % participation
│       │   │
│       │   └── ui/                        # Generic reusable UI components
│       │       ├── Button.vue
│       │       ├── Card.vue
│       │       ├── Input.vue
│       │       ├── Badge.vue
│       │       ├── Progress.vue           # Progress bar component
│       │       ├── Avatar.vue             # FR6: Avatar Twitch
│       │       ├── Dialog.vue
│       │       └── Toast.vue              # Toast notifications
│       │
│       ├── stores/                        # Pinia 3 stores (domain-based)
│       │   ├── gameStore.ts               # FR17-FR24: Global game state (territories, players)
│       │   ├── lobbyStore.ts              # FR7-FR11: Lobby state
│       │   ├── playerStore.ts             # Local player info
│       │   ├── battleStore.ts             # FR25-FR33: Active battle state (progress, spammers)
│       │   └── websocketStore.ts          # FR54-FR57: WebSocket connection + routing
│       │
│       ├── composables/                   # Vue 3 Composition API reusables
│       │   ├── useWebSocket.ts            # FR54-FR57: WebSocket connection management
│       │   ├── useAudio.ts                # FR44-FR49: Audio manager (Howler.js)
│       │   ├── useGameState.ts            # Game state helpers
│       │   └── useKeyboard.ts             # FR50: Keyboard shortcuts (Tab)
│       │
│       ├── services/                      # External service integrations
│       │   ├── api.ts                     # REST API client (create/join room)
│       │   └── websocket.ts               # WebSocket client wrapper
│       │
│       ├── lib/                           # Utilities and helpers
│       │   ├── utils.ts                   # Generic utils
│       │   ├── audioSettings.ts           # FR49: Audio prefs LocalStorage
│       │   ├── constants.ts               # Constants (MAX_PLAYERS, etc.)
│       │   └── validators.ts              # Client-side validation helpers
│       │
│       └── types/                         # Frontend-specific types
│           ├── ui.ts                      # UI component prop types
│           └── audio.ts                   # Audio types (Howler.js)
│
├── backend/                               # Fastify 5.6 + TypeScript + WebSocket natif
│   ├── Dockerfile                         # Multi-stage: dev + build + run
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── .env.development
│   ├── .env.production
│   │
│   └── src/
│       ├── server.ts                      # Fastify app entry + WebSocket setup
│       │
│       ├── config/
│       │   └── index.ts                   # FR5-FR16: Config loader (per-room + global)
│       │
│       ├── managers/                      # Business logic managers
│       │   ├── RoomManager.ts             # FR1-FR11: Room lifecycle, TTL, join/create
│       │   ├── GameEngine.ts              # FR17-FR24, FR34-FR40: Combat, state machine, BOT logic
│       │   └── TwitchManager.ts           # FR12-FR16: tmi.js integration, reconnection
│       │
│       ├── routes/                        # REST API routes
│       │   ├── health.ts                  # NFR15: Health check endpoint
│       │   └── game.ts                    # FR1: POST /api/rooms, POST /api/rooms/:code/join
│       │
│       ├── websocket/                     # WebSocket natif handlers
│       │   ├── handler.ts                 # FR54-FR57: WebSocket connection handler
│       │   ├── events.ts                  # Event handlers (attack, defend, join, etc.)
│       │   └── broadcast.ts               # FR25-FR29: Broadcasting utilities
│       │
│       ├── models/                        # Data models
│       │   ├── Game.ts                    # Game state model
│       │   ├── Player.ts                  # FR7-FR43: Player model (status, territories)
│       │   ├── Territory.ts               # FR9, FR38-FR40: Territory model with BOT logic
│       │   └── Battle.ts                  # FR17-FR33: Battle resolution model
│       │
│       └── utils/
│           ├── logger.ts                  # Pino 10.1 logger configuration
│           ├── errors.ts                  # Custom error classes
│           └── validators.ts              # Server-side validation helpers
│
└── shared/                                # Shared types TypeScript
    ├── package.json
    ├── tsconfig.json
    │
    └── src/
        ├── index.ts                       # Main export file
        │
        ├── schemas/                       # Zod validation schemas
        │   ├── player.ts                  # PlayerSchema
        │   ├── game.ts                    # GameSchema, GameConfigSchema
        │   ├── territory.ts               # TerritorySchema
        │   ├── battle.ts                  # BattleSchema
        │   ├── events.ts                  # WebSocket event payload schemas
        │   └── api.ts                     # REST API request/response schemas
        │
        ├── types/                         # TypeScript types
        │   ├── game.ts                    # Game, GameState, GameConfig
        │   ├── player.ts                  # Player, PlayerStatus
        │   ├── territory.ts               # Territory, TerritoryStats
        │   ├── battle.ts                  # Battle, BattleResult, BattleStats
        │   └── events.ts                  # ClientToServerEvents, ServerToClientEvents
        │
        └── errors/                        # Custom error classes
            ├── base.ts                    # AppError base class
            └── index.ts                   # GameError, ValidationError, TwitchError, WebSocketError
```

---

### Architectural Boundaries

#### API Boundaries

**REST API Endpoints** (Backend → Frontend):

```typescript
// Public REST endpoints
POST   /api/rooms              // FR1: Create new game room
POST   /api/rooms/:code/join   // FR1: Join existing room
GET    /health                 // NFR15: Health check endpoint

// No authentication required (private collectif app)
// CORS configured per environment (.env CORS_ORIGIN)
```

**WebSocket Boundary** (ws:// native protocol):

```typescript
// Connection endpoint
WS     /ws                     // FR54-FR57: WebSocket native connection

// Event-based bidirectional communication
// Validation: All events validated with Zod schemas
// Format: { event: 'namespace:action', data: {...} }
```

**Separation of Concerns:**
- **REST**: Non-realtime operations (create room, join room, health check)
- **WebSocket**: All realtime gameplay (lobby updates, battles, game state)
- **No GraphQL**: Overkill pour ce use case (10 joueurs, operations simples)

---

#### Component Boundaries

**Frontend Component Communication Patterns:**

**1. Parent → Child** (Props):
```typescript
// Example: GameMap.vue reçoit territories from Game.vue
<GameMap :territories="gameStore.territories" :players="gameStore.players" />
```

**2. Child → Parent** (Events):
```typescript
// Example: LobbyTerritoryPicker.vue émet selection au parent
emit('territory-selected', territoryId)
```

**3. Global State** (Pinia Stores):
```typescript
// Cross-component communication via stores
// Example: websocketStore updates → battleStore reacts → BattleProgress.vue re-renders
const battleStore = useBattleStore()
const progress = computed(() => battleStore.currentBattleProgress)
```

**4. Composables** (Shared Logic):
```typescript
// Example: useAudio.ts used by multiple components
const { playSound, setVolume } = useAudio()
playSound('war_horn')
```

**Component Hierarchy:**
```
App.vue (root)
├── router-view
    ├── Home.vue
    ├── Lobby.vue
    │   ├── LobbyPlayerList.vue
    │   ├── LobbyTerritoryPicker.vue (interacts with Canvas)
    │   ├── LobbyConfigPanel.vue
    │   └── LobbyInstructions.vue
    ├── Game.vue
    │   ├── GameHeader.vue
    │   ├── GameMap.vue (Canvas rendering)
    │   ├── GameCommandPanel.vue
    │   ├── GameActionHistory.vue (Toast feed)
    │   ├── GameScoreboardOverlay.vue (Toggle avec Tab)
    │   ├── BattleProgress.vue (Active battle overlay)
    │   └── GameLegend.vue
    └── Victory.vue
        ├── GameWinnerDialog.vue
        └── BattleSummary.vue
```

---

#### Service Boundaries

**Backend Service Communication:**

```
server.ts (Fastify entry)
    ↓
RoomManager ←→ GameEngine ←→ TwitchManager
    ↓               ↓              ↓
WebSocket      Models         tmi.js
broadcast      (Game,         (Twitch IRC)
               Player,
               Territory,
               Battle)
```

**Service Responsibilities:**

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| `RoomManager` | Room lifecycle, TTL, join/create logic | GameEngine, WebSocket broadcast |
| `GameEngine` | Combat resolution, state machine, victory detection | TwitchManager (force counts), Models |
| `TwitchManager` | tmi.js integration, IRC reconnection, message counting | tmi.js library |
| `WebSocket handler` | Connection management, event routing, broadcasting | RoomManager, GameEngine |

**No External Services:**
- Pas de database (état en mémoire)
- Pas d'auth service (pas OAuth, collectif privé)
- Pas de cloud storage (parties éphémères)

---

#### Data Boundaries

**Data Flow Architecture:**

```
Frontend Client
    ↓ (REST POST /api/rooms)
Backend RoomManager
    ↓ (creates in-memory room)
In-Memory State (Map<roomCode, GameState>)
    ↓ (WebSocket broadcasts)
All Connected Clients (synchronization)
```

**Data Access Patterns:**

**In-Memory State Management:**
```typescript
// Backend: Single source of truth
class RoomManager {
  private rooms: Map<string, Game> = new Map()

  createRoom(config: GameConfig): Game {
    const game = new Game(config)
    this.rooms.set(game.code, game)
    return game
  }

  getRoom(code: string): Game | undefined {
    return this.rooms.get(code)
  }
}
```

**No Database Layer:**
- Pas de migrations, pas d'ORM
- État complètement éphémère
- TTL: 30 min après dernière activité (garbage collection)

**Caching Strategy:**
- **LocalStorage Frontend**: Audio preferences uniquement (FR49)
- **In-Memory Backend**: Entire game state
- **No Redis**: Overkill pour 10 joueurs simultanés

**Data Persistence Boundaries:**
- ✅ **Persisted**: Audio prefs (LocalStorage frontend)
- ❌ **Not Persisted**: Game state, player data, battle history, stats
- **Rationale**: Parties éphémères pour tests collectif, pas besoin historique

---

### Requirements to Structure Mapping

#### Feature Category Mapping (FR1-FR57 → Files)

**FR1-FR6: Game Setup & Configuration**
- Backend:
  - `backend/src/managers/RoomManager.ts` - Create room, generate code unique
  - `backend/src/routes/game.ts` - POST /api/rooms endpoint
  - `backend/src/config/index.ts` - Per-room config (battleDuration, cooldown, etc.)
- Frontend:
  - `frontend/src/views/Home.vue` - Create room form
  - `frontend/src/components/lobby/LobbyConfigPanel.vue` - Config UI (sliders, inputs)
- Shared:
  - `shared/src/schemas/game.ts` - GameConfigSchema (Zod validation)
  - `shared/src/types/game.ts` - GameConfig type

---

**FR7-FR11: Lobby & Pre-Game**
- Backend:
  - `backend/src/managers/RoomManager.ts` - Join logic, player management
  - `backend/src/websocket/events.ts` - Handlers: player:join, player:ready, territory:select
  - `backend/src/websocket/broadcast.ts` - Broadcast lobby:update to all clients
- Frontend:
  - `frontend/src/views/Lobby.vue` - Main lobby view
  - `frontend/src/stores/lobbyStore.ts` - Lobby state (players, selections)
  - `frontend/src/components/lobby/LobbyPlayerList.vue` - Realtime player list
  - `frontend/src/components/lobby/LobbyTerritoryPicker.vue` - Canvas 2D territory selection
  - `frontend/src/components/lobby/LobbyInstructions.vue` - Instructions intégrées
- Shared:
  - `shared/src/types/events.ts` - player:join, player:ready, territory:select, lobby:update events

---

**FR12-FR16: Twitch Integration**
- Backend:
  - `backend/src/managers/TwitchManager.ts` - tmi.js integration, reconnection, message counting
  - `backend/src/config/index.ts` - Twitch IRC config (channel names, reconnect timeout)
- Shared:
  - `shared/src/errors/index.ts` - TwitchError custom error class

**Twitch IRC Flow:**
```
TwitchManager.connect(channelName)
    ↓
tmi.js library (anonymous mode)
    ↓
on('message') → Parse ATTACK/DEFEND commands → Update force counters
    ↓
GameEngine.updateBattleForce()
    ↓
WebSocket broadcast battle:progress event
    ↓
Frontend BattleProgress.vue updates bars
```

---

**FR17-FR24: Combat & Gameplay Core**
- Backend:
  - `backend/src/managers/GameEngine.ts` - Combat resolution, state machine, formule équilibrage
  - `backend/src/models/Battle.ts` - Battle model (attackerId, defenderId, forces)
  - `backend/src/models/Territory.ts` - Territory stats, ownership transfer
  - `backend/src/websocket/events.ts` - Handlers: action:attack, action:defend
- Frontend:
  - `frontend/src/stores/battleStore.ts` - Active battle state
  - `frontend/src/components/battle/BattleProgress.vue` - Realtime progress bars
  - `frontend/src/stores/gameStore.ts` - Territory ownership updates
- Shared:
  - `shared/src/schemas/battle.ts` - BattleSchema (Zod)
  - `shared/src/types/battle.ts` - Battle, BattleResult types
  - `shared/src/types/events.ts` - action:attack, action:defend, battle:start, battle:result events

---

**FR25-FR29: Real-Time Feedback & Visualization**
- Backend:
  - `backend/src/websocket/broadcast.ts` - Broadcasting game:stateUpdate, battle:progress
  - `backend/src/managers/GameEngine.ts` - Generate battle progress updates (every 500ms)
- Frontend:
  - `frontend/src/components/battle/BattleProgress.vue` - Progress bars (attacker/defender forces)
  - `frontend/src/components/game/GameActionHistory.vue` - Toast feed messages validés
  - `frontend/src/components/game/GameMap.vue` - Canvas 2D grille avec animations
  - `frontend/src/stores/websocketStore.ts` - Route incoming WebSocket messages
- Shared:
  - `shared/src/types/events.ts` - battle:progress, game:stateUpdate events

---

**FR30-FR33: Battle Summary & Recognition**
- Backend:
  - `backend/src/managers/GameEngine.ts` - Calculate top 5 spammers, % participation
  - `backend/src/models/Battle.ts` - BattleResult with stats
- Frontend:
  - `frontend/src/components/battle/BattleSummary.vue` - Post-battle summary dialog
  - `frontend/src/components/battle/BattleSpammerList.vue` - Top 5 list avec avatars
- Shared:
  - `shared/src/types/battle.ts` - BattleStats (topSpammers, participationRate)

---

**FR34-FR37: Victory & Game End**
- Backend:
  - `backend/src/managers/GameEngine.ts` - Detect victory condition (all territories owned)
  - `backend/src/websocket/broadcast.ts` - Broadcast game:victory event
- Frontend:
  - `frontend/src/views/Victory.vue` - Victory screen with stats
  - `frontend/src/components/game/GameWinnerDialog.vue` - Winner dialog overlay
  - `frontend/src/stores/gameStore.ts` - Game end state management
- Shared:
  - `shared/src/types/events.ts` - game:victory event
  - `shared/src/types/game.ts` - GameStats type

---

**FR38-FR40: BOT Territories & Free Zones**
- Backend:
  - `backend/src/models/Territory.ts` - BOT territory logic (ownerId === 'BOT')
  - `backend/src/managers/GameEngine.ts` - BOT resistance calculation (proportional to territory size)

---

**FR41-FR43: Rage-Quit & Player Management**
- Backend:
  - `backend/src/websocket/handler.ts` - on('close') event → handleDisconnect()
  - `backend/src/managers/GameEngine.ts` - Free territories on disconnect
  - `backend/src/websocket/broadcast.ts` - Broadcast player:disconnect event
- Frontend:
  - `frontend/src/stores/gameStore.ts` - Update player status (eliminated)
- Shared:
  - `shared/src/types/events.ts` - player:disconnect event

---

**FR44-FR49: Audio & Atmosphere**
- Frontend:
  - `frontend/src/composables/useAudio.ts` - Howler.js wrapper (playSound, setVolume)
  - `frontend/src/lib/audioSettings.ts` - LocalStorage persistence (volume prefs)
  - `frontend/public/audio/` - Audio files (theme.mp3, war_theme.mp3, war_horn.mp3, victory.mp3)
  - `frontend/src/views/Lobby.vue` - Trigger lobby music
  - `frontend/src/views/Game.vue` - Trigger game music
  - `frontend/src/components/battle/BattleProgress.vue` - Trigger SFX (war_horn.mp3)
- No backend: Audio is 100% frontend

---

**FR50-FR53: Advanced UI & Interaction**
- Frontend:
  - `frontend/src/components/game/GameScoreboardOverlay.vue` - Leaderboard (toggle avec Tab)
  - `frontend/src/composables/useKeyboard.ts` - Keyboard shortcut handler (Tab key)
  - `frontend/src/components/game/GameActionHistory.vue` - Historique actions (toast feed)
  - `frontend/src/views/Home.vue` - Tutoriel page accueil
  - `frontend/tailwind.config.ts` - Streaming-optimized styles (18px+ text, contrastes)

---

**FR54-FR57: WebSocket & Real-Time Communication**
- Backend:
  - `backend/src/websocket/handler.ts` - WebSocket connection handler (@fastify/websocket)
  - `backend/src/websocket/events.ts` - Event routing and validation
  - `backend/src/websocket/broadcast.ts` - Broadcasting to all clients in room
- Frontend:
  - `frontend/src/stores/websocketStore.ts` - WebSocket connection management + reconnection
  - `frontend/src/services/websocket.ts` - WebSocket client wrapper (ws library)
  - `frontend/src/composables/useWebSocket.ts` - Composable for WebSocket hooks
- Shared:
  - `shared/src/types/events.ts` - ClientToServerEvents, ServerToClientEvents
  - `shared/src/schemas/events.ts` - Event payload schemas (Zod validation)

---

#### Cross-Cutting Concerns Mapping

**Error Handling:**
- `shared/src/errors/` - Custom error classes (GameError, ValidationError, TwitchError, WebSocketError)
- `backend/src/utils/errors.ts` - Fastify global error handler
- `frontend/src/lib/utils.ts` - Frontend error display helpers

**Validation:**
- `shared/src/schemas/` - All Zod schemas (single source of truth)
- `backend/src/utils/validators.ts` - Server-side validation helpers
- `frontend/src/lib/validators.ts` - Client-side validation helpers

**Logging:**
- `backend/src/utils/logger.ts` - Pino 10.1 configuration
- All backend files import logger for structured logging

**Configuration:**
- `.env.development`, `.env.production` - Environment-based config
- `backend/src/config/index.ts` - Config loader avec per-room immutable config

---

### Integration Points

#### Internal Communication (Frontend ↔ Backend)

**1. REST API Communication:**
```typescript
// frontend/src/services/api.ts
export async function createRoom(config: GameConfig): Promise<{ roomCode: string }> {
  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  return response.json()
}

// backend/src/routes/game.ts
fastify.post('/api/rooms', async (request, reply) => {
  const config = GameConfigSchema.parse(request.body)
  const room = roomManager.createRoom(config)
  return { roomCode: room.code, roomId: room.id }
})
```

**2. WebSocket Communication:**
```typescript
// Frontend sends event
const websocketStore = useWebSocketStore()
websocketStore.send('action:attack', { targetTerritoryId: 'T15' })

// Backend receives event
socket.on('message', (message) => {
  const { event, data } = JSON.parse(message.toString())

  // Validate with Zod
  const schema = ClientEventSchemas[event]
  const validated = schema.parse(data)

  // Route to handler
  await eventHandlers[event](socket, validated, connectionId)
})

// Backend broadcasts to room
function broadcastToRoom(roomCode: string, event: string, data: unknown) {
  const connections = getConnectionsByRoom(roomCode)
  connections.forEach(socket => {
    socket.send(JSON.stringify({ event, data }))
  })
}

// Frontend receives event
websocketStore.ws.onmessage = (event) => {
  const { event: eventName, data } = JSON.parse(event.data)

  // Route to appropriate store
  switch (eventName) {
    case 'battle:progress':
      useBattleStore().updateProgress(data)
      break
    case 'game:stateUpdate':
      useGameStore().updateState(data)
      break
  }
}
```

---

#### External Integrations

**1. Twitch IRC (tmi.js):**
```typescript
// backend/src/managers/TwitchManager.ts
import tmi from 'tmi.js'

class TwitchManager {
  private clients: Map<string, tmi.Client> = new Map()

  async connectToChannel(channelName: string, roomId: string) {
    const client = new tmi.Client({
      connection: { reconnect: true, secure: true },
      channels: [channelName]
    })

    client.on('message', (channel, tags, message, self) => {
      this.handleTwitchMessage(roomId, tags.username, message)
    })

    client.on('disconnected', () => {
      logger.warn({ channel: channelName }, 'Twitch IRC disconnected, reconnecting...')
      setTimeout(() => client.connect(), 10000) // FR15: Reconnect every 10 sec
    })

    await client.connect()
    this.clients.set(roomId, client)
  }

  private handleTwitchMessage(roomId: string, username: string, message: string) {
    const normalized = message.trim().toUpperCase()

    // FR14: Parse ATTACK/DEFEND commands (case insensitive)
    if (normalized === 'ATTACK' || normalized === 'DEFEND') {
      // FR13: Count messages + unique users
      this.incrementForceCounter(roomId, username, normalized)
    }
  }
}
```

**Integration Boundary:**
- Twitch IRC est 100% backend
- Frontend ne communique jamais directement avec Twitch
- Backend → Twitch IRC (read-only, anonymous mode, no OAuth)

**2. Howler.js (Audio):**
```typescript
// frontend/src/composables/useAudio.ts
import { Howl } from 'howler'

export function useAudio() {
  const sounds = {
    theme: new Howl({ src: ['/audio/theme.mp3'], loop: true }),
    war_theme: new Howl({ src: ['/audio/war_theme.mp3'], loop: true }),
    war_horn: new Howl({ src: ['/audio/war_horn.mp3'] }),
    victory: new Howl({ src: ['/audio/victory.mp3'] })
  }

  function playSound(name: keyof typeof sounds) {
    sounds[name].play()
  }

  function setVolume(volume: number) {
    Object.values(sounds).forEach(sound => sound.volume(volume))
    localStorage.setItem('audio_volume', String(volume)) // FR49: Persist prefs
  }

  return { playSound, setVolume }
}
```

**Integration Boundary:**
- Howler.js est 100% frontend
- Audio files servis statiquement depuis `frontend/public/audio/`
- No backend audio processing

---

#### Data Flow

**Complete Data Flow Example (Attack Action):**

```
1. Frontend: User clicks "Attack" button
   ↓
   frontend/src/components/game/GameCommandPanel.vue
   ↓
   Calls: websocketStore.send('action:attack', { targetTerritoryId: 'T15' })
   ↓

2. Frontend: WebSocket client sends message
   ↓
   frontend/src/stores/websocketStore.ts
   ↓
   WebSocket.send(JSON.stringify({ event: 'action:attack', data: { targetTerritoryId: 'T15' } }))
   ↓

3. Backend: WebSocket handler receives message
   ↓
   backend/src/websocket/handler.ts
   ↓
   Validates with AttackEventSchema.parse(data)
   ↓
   Routes to: eventHandlers['action:attack'](socket, data, connectionId)
   ↓

4. Backend: Event handler processes attack
   ↓
   backend/src/websocket/events.ts → handleAttackAction()
   ↓
   Calls: gameEngine.startBattle(roomId, attackerId, targetTerritoryId)
   ↓

5. Backend: Game Engine processes battle
   ↓
   backend/src/managers/GameEngine.ts
   ↓
   - Validates battle can start (territory adjacency, locks, etc.)
   - Creates Battle instance
   - Connects TwitchManager to both channels (attacker + defender)
   - Starts battle timer (configurable duration)
   - Broadcasts: battle:start event to all clients in room
   ↓

6. Backend: Twitch IRC messages accumulate
   ↓
   backend/src/managers/TwitchManager.ts
   ↓
   - Counts ATTACK/DEFEND messages from both channels
   - Updates force counters (messages + unique users)
   - Every 500ms: broadcasts battle:progress to room
   ↓

7. Frontend: Receives battle:progress events
   ↓
   frontend/src/stores/websocketStore.ts → routes to battleStore
   ↓
   frontend/src/stores/battleStore.ts → updates progress state
   ↓
   frontend/src/components/battle/BattleProgress.vue → re-renders progress bars
   ↓

8. Backend: Battle timer expires
   ↓
   backend/src/managers/GameEngine.ts → resolveBattle()
   ↓
   - Calculates final forces: Force = (messages × 0.7) + (uniqueUsers × territoryBonus)
   - Determines winner (attacker vs defender)
   - Updates territory ownership if attacker wins
   - Generates BattleResult with top 5 spammers
   - Broadcasts: battle:result event to room
   - Broadcasts: game:stateUpdate event with new territory ownership
   ↓

9. Frontend: Receives battle:result + game:stateUpdate
   ↓
   battleStore.setResult(result)
   gameStore.updateTerritories(territories)
   ↓
   frontend/src/components/battle/BattleSummary.vue → shows summary dialog
   frontend/src/components/game/GameMap.vue → updates territory colors on canvas
   ↓

10. Frontend: User sees result, cycle repeats
```

---

### File Organization Patterns

#### Configuration Files

**Root Configuration:**
```
conflict-of-streamers/
├── package.json              # npm workspaces definition
├── .gitignore                # Git ignore (node_modules, .env, dist)
├── .dockerignore             # Docker ignore
├── docker-compose.yml        # Dev environment
└── docker-compose.prod.yml   # Production deployment
```

**Frontend Configuration:**
```
frontend/
├── package.json              # Vue 3.5, Vite 7.2, Tailwind 4.1, dependencies
├── vite.config.ts            # Vite configuration (proxy WebSocket, aliases)
├── tailwind.config.ts        # Tailwind 4.1 config (streaming colors, fonts)
├── tsconfig.json             # Base TypeScript config
├── tsconfig.app.json         # App-specific TypeScript config
├── tsconfig.node.json        # Node-specific TypeScript config
├── .env.development          # VITE_API_URL, VITE_WS_URL (dev)
├── .env.production           # Production URLs
└── nginx.conf                # Production nginx config (proxy WebSocket)
```

**Backend Configuration:**
```
backend/
├── package.json              # Fastify 5.6, tmi.js, pino, dependencies
├── tsconfig.json             # TypeScript config (ES modules, strict)
├── .env.development          # NODE_ENV, PORT, CORS_ORIGIN, LOG_LEVEL (dev)
└── .env.production           # Production environment vars
```

**Shared Configuration:**
```
shared/
├── package.json              # Shared types package
└── tsconfig.json             # Shared TypeScript config
```

---

#### Source Organization

**Frontend Source Structure:**
- **Entry Point**: `src/main.ts` - Bootstrap Vue app, register router, Pinia, global styles
- **Root Component**: `src/App.vue` - Root layout avec <router-view>
- **Views**: `src/views/` - Page-level components (4 routes: Home, Lobby, Game, Victory)
- **Components**: `src/components/` - Domain-organized (lobby/, game/, battle/, ui/)
- **Stores**: `src/stores/` - Pinia stores (5 stores: game, lobby, player, battle, websocket)
- **Composables**: `src/composables/` - Reusable composition logic (useAudio, useWebSocket, useKeyboard)
- **Services**: `src/services/` - External communication (api.ts for REST, websocket.ts wrapper)
- **Lib**: `src/lib/` - Utilities, constants, helpers
- **Types**: `src/types/` - Frontend-specific types (ui.ts, audio.ts)

**Backend Source Structure:**
- **Entry Point**: `src/server.ts` - Fastify server setup, plugin registration, start
- **Config**: `src/config/` - Configuration loading (per-room + global)
- **Managers**: `src/managers/` - Business logic (RoomManager, GameEngine, TwitchManager)
- **Routes**: `src/routes/` - REST API routes (health.ts, game.ts)
- **WebSocket**: `src/websocket/` - WebSocket handlers (handler.ts, events.ts, broadcast.ts)
- **Models**: `src/models/` - Data models (Game, Player, Territory, Battle)
- **Utils**: `src/utils/` - Logging, errors, validators

**Shared Source Structure:**
- **Entry**: `src/index.ts` - Main export file
- **Schemas**: `src/schemas/` - Zod validation schemas (player, game, territory, battle, events, api)
- **Types**: `src/types/` - TypeScript types inferred from schemas
- **Errors**: `src/errors/` - Custom error classes hierarchy

---

#### Test Organization

**Co-located Tests** (Pattern défini dans Implementation Patterns):

```
backend/src/
├── managers/
│   ├── GameEngine.ts
│   ├── GameEngine.test.ts         # Unit tests for GameEngine
│   ├── RoomManager.ts
│   ├── RoomManager.test.ts        # Unit tests for RoomManager
│   ├── TwitchManager.ts
│   └── TwitchManager.test.ts      # Unit tests for TwitchManager
│
├── websocket/
│   ├── handler.ts
│   ├── handler.test.ts            # Integration tests for WebSocket
│   ├── events.ts
│   └── events.test.ts             # Unit tests for event handlers

frontend/src/
├── stores/
│   ├── gameStore.ts
│   ├── gameStore.test.ts          # Unit tests for gameStore
│   ├── battleStore.ts
│   └── battleStore.test.ts        # Unit tests for battleStore
│
├── components/
│   ├── game/
│   │   ├── GameMap.vue
│   │   ├── GameMap.test.ts        # Component tests for GameMap
│   │   ├── BattleProgress.vue
│   │   └── BattleProgress.test.ts # Component tests

# Future E2E tests (defer to post-MVP)
tests/
└── e2e/
    ├── lobby-flow.spec.ts         # E2E: Create room → Join → Select territories
    ├── battle-flow.spec.ts        # E2E: Start battle → Twitch messages → Result
    └── victory-flow.spec.ts       # E2E: Complete game → Victory screen
```

**Test Framework** (defer to post-MVP):
- Frontend: Vitest + Vue Test Utils
- Backend: Vitest
- E2E: Playwright

---

#### Asset Organization

**Static Assets:**
```
frontend/public/
├── favicon.ico
├── audio/                          # FR44-FR49: Audio files
│   ├── theme.mp3                   # Lobby music (orchestral)
│   ├── war_theme.mp3               # Battle music (intense)
│   ├── war_horn.mp3                # SFX attack start
│   └── victory.mp3                 # SFX victory
└── images/
    └── world-map-placeholder.svg   # Placeholder pour grille
```

**Build Assets** (generated):
```
frontend/dist/                      # Vite build output (production)
├── index.html
├── assets/
│   ├── index-[hash].js             # Bundled JavaScript
│   └── index-[hash].css            # Bundled CSS
└── audio/                          # Copied from public/

backend/dist/                       # TypeScript compilation output
├── server.js
├── managers/
│   ├── GameEngine.js
│   ├── RoomManager.js
│   └── TwitchManager.js
├── routes/
├── websocket/
└── ...
```

---

### Development Workflow Integration

#### Development Server Structure

**Local Development** (`npm run dev` from root):

```bash
# Starts both frontend + backend concurrently
npm run dev

# Internally runs:
concurrently "npm run dev --workspace=frontend" "npm run dev --workspace=backend"
```

**Frontend Dev Server** (Vite 7.2):
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // Proxy REST to backend
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3000',    // Proxy WebSocket to backend
        ws: true
      }
    }
  }
})
```

**Backend Dev Server** (Fastify + tsx watch):
```bash
# package.json script
"dev": "tsx watch src/server.ts"

# Auto-restarts on file changes (hot reload)
```

**Docker Compose Dev** (`docker-compose up`):
```yaml
services:
  frontend:
    build:
      target: development         # Uses dev stage in Dockerfile
    volumes:
      - ./frontend:/app/frontend  # Hot reload frontend code
      - ./shared:/app/shared      # Hot reload shared types
    ports:
      - "5173:5173"
    command: npm run dev --workspace=frontend

  backend:
    build:
      target: development         # Uses dev stage in Dockerfile
    volumes:
      - ./backend:/app/backend    # Hot reload backend code
      - ./shared:/app/shared      # Hot reload shared types
    ports:
      - "3000:3000"
    command: npm run dev --workspace=backend
```

---

#### Build Process Structure

**Production Build** (`npm run build` from root):

```bash
npm run build

# Internally runs:
npm run build --workspaces

# Builds in order:
# 1. shared/ - Compile TypeScript types
# 2. frontend/ - Vite build (bundle + optimize)
# 3. backend/ - TypeScript compilation
```

**Build Output:**
```
frontend/dist/                # Static assets (served by nginx)
backend/dist/                 # Node.js executable files
shared/dist/                  # Compiled types (referenced by frontend + backend)
```

**Build Artifacts Used by Docker:**
```dockerfile
# Frontend Dockerfile (production stage)
FROM nginx:alpine AS production
COPY --from=build /app/frontend/dist /usr/share/nginx/html  # ← Uses build output
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Backend Dockerfile (production stage)
FROM node:20-alpine AS production
COPY --from=build /app/backend/dist ./backend/dist          # ← Uses build output
COPY --from=build /app/shared/dist ./shared/dist            # ← Uses shared types
CMD ["node", "backend/dist/server.js"]
```

---

#### Deployment Structure

**Manual Docker Compose Deployment** (AD-14):

```bash
# On VPS
cd /path/to/conflict-of-streamers

# Pull latest code
git pull origin main

# Build and start production containers
docker-compose -f docker-compose.prod.yml up --build -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f

# Health check
curl http://localhost:3000/health
# Response: { "status": "ok", "uptime": 123.45 }
```

**Production Docker Compose** (`docker-compose.prod.yml`):
```yaml
services:
  frontend:
    build:
      target: production          # Uses production stage
    ports:
      - "80:80"                   # Nginx serves on port 80
    environment:
      - VITE_API_URL=https://your-domain.com
      - VITE_WS_URL=wss://your-domain.com

  backend:
    build:
      target: production          # Uses production stage
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - CORS_ORIGIN=https://your-domain.com
      - LOG_LEVEL=info            # Production logging (less verbose)
```

**No CI/CD for MVP** (AD-14):
- Manual deployment suffisant pour collectif privé (10 utilisateurs)
- Can add GitHub Actions later si besoin

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

✅ **Frontend Stack** - Compatible à 100%
- Vue 3.5 + Vite 7.2 + Pinia 3 + Vue Router 4.4 → Versions compatibles
- Tailwind CSS 4.1 avec Vue 3.5 → Compatible
- TypeScript 5.6+ utilisé partout → Compatible
- ws 8.18 client WebSocket → Compatible avec @fastify/websocket serveur

✅ **Backend Stack** - Compatible à 100%
- Fastify 5.6 + @fastify/websocket 11.2 → WebSocket natif compatible
- Node.js 20 LTS requis par Fastify 5.6 → Compatible
- tmi.js 1.8 + Pino 10.1 → Compatible avec Fastify
- TypeScript 5.6+ avec ES Modules → Compatible

✅ **Shared Stack** - Compatible à 100%
- Zod ^3.23 utilisable frontend + backend → Compatible
- TypeScript types inférés de Zod → Compatible
- Custom error classes partagées → Compatible

**Pattern Consistency:**

✅ Tous les patterns supportent les décisions architecturales
- PascalCase .vue / camelCase .ts → Aligné avec Vue + Node ecosystems
- namespace:action WebSocket events → Cohérent avec event-sourcing (AD-2)
- Immutable Pinia updates → Aligné avec Vue 3 reactivity
- Domain-based stores → Aligné avec architecture modulaire
- Try/catch + custom errors → Aligné avec Fastify error handling

**Structure Alignment:**

✅ La structure supporte toutes les décisions
- Monorepo npm workspaces → Supporte shared types (AD-7 Zod schemas)
- Docker multi-stage → Supporte AD-14 manual deployment
- Co-located tests → Aligné avec implementation patterns
- Domain-organized components → Supporte AD-10 domain-based stores

---

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (FR1-FR57):**

✅ **FR1-FR6 (Game Setup & Configuration)** - 100% couvert
- `backend/src/managers/RoomManager.ts` - Room creation + code generation
- `backend/src/routes/game.ts` - REST API endpoints
- `backend/src/config/index.ts` - Per-room immutable config (AD-6)
- `frontend/src/views/Home.vue` - Create room UI
- `frontend/src/components/lobby/LobbyConfigPanel.vue` - Config sliders

✅ **FR7-FR11 (Lobby & Pre-Game)** - 100% couvert
- `backend/src/websocket/events.ts` - player:join, player:ready handlers
- `frontend/src/views/Lobby.vue` - Main lobby view
- `frontend/src/stores/lobbyStore.ts` - Lobby state management
- `frontend/src/components/lobby/LobbyTerritoryPicker.vue` - Canvas 2D selection (AD-1)

✅ **FR12-FR16 (Twitch Integration)** - 100% couvert
- `backend/src/managers/TwitchManager.ts` - tmi.js 1.8 integration, reconnection (AD-3)
- Parsing ATTACK/DEFEND case-insensitive (NFR13)
- Dual counting (optimistic + authoritative) (AD-3)

✅ **FR17-FR24 (Combat & Gameplay Core)** - 100% couvert
- `backend/src/managers/GameEngine.ts` - Combat resolution, state machine (AD-2)
- `backend/src/models/Battle.ts` - Battle model avec formule équilibrage
- Verrous d'état (state machine) (AD-2)

✅ **FR25-FR29 (Real-Time Feedback)** - 100% couvert
- `backend/src/websocket/broadcast.ts` - Broadcasting < 200ms (NFR1)
- `frontend/src/components/battle/BattleProgress.vue` - Progress bars < 100ms (NFR2)
- `frontend/src/components/game/GameMap.vue` - Canvas 2D rendering (AD-1)

✅ **FR30-FR33 (Battle Summary)** - 100% couvert
- `backend/src/managers/GameEngine.ts` - Top 5 spammers calculation
- `frontend/src/components/battle/BattleSummary.vue` - Post-battle dialog
- `frontend/src/components/battle/BattleSpammerList.vue` - Recognition UI

✅ **FR34-FR37 (Victory & Game End)** - 100% couvert
- `backend/src/managers/GameEngine.ts` - Victory detection
- `frontend/src/views/Victory.vue` - Victory screen
- `frontend/src/components/game/GameWinnerDialog.vue` - Winner overlay

✅ **FR38-FR40 (BOT Territories)** - 100% couvert
- `backend/src/models/Territory.ts` - BOT logic (ownerId === 'BOT')
- `backend/src/managers/GameEngine.ts` - BOT resistance proportionnel

✅ **FR41-FR43 (Rage-Quit)** - 100% couvert
- `backend/src/websocket/handler.ts` - on('close') disconnect handling
- `backend/src/managers/GameEngine.ts` - Free territories on disconnect

✅ **FR44-FR49 (Audio)** - 100% couvert
- `frontend/src/composables/useAudio.ts` - Howler.js 2.2 wrapper
- `frontend/src/lib/audioSettings.ts` - LocalStorage persistence
- `frontend/public/audio/` - 4 audio files (theme, war_theme, war_horn, victory)

✅ **FR50-FR53 (Advanced UI)** - 100% couvert
- `frontend/src/components/game/GameScoreboardOverlay.vue` - Tab leaderboard
- `frontend/src/composables/useKeyboard.ts` - Keyboard shortcuts
- `frontend/tailwind.config.ts` - 18px+ fonts, contrastes (NFR streaming)

✅ **FR54-FR57 (WebSocket)** - 100% couvert
- `backend/src/websocket/handler.ts` - @fastify/websocket 11.2
- `frontend/src/stores/websocketStore.ts` - Connection + reconnection
- Latency < 200ms (NFR1) via WebSocket natif (AD-5, pas Socket.io)

**Non-Functional Requirements Coverage (NFR1-NFR16):**

✅ **NFR1-NFR5 (Performance)** - 100% satisfait
- WebSocket < 200ms → AD-5 (@fastify/websocket natif, pas overhead Socket.io)
- UI réactive < 100ms → Vue 3 reactivity native + AD-3 (dual counting)
- Calculs bataille < 500ms → In-memory state, formule simple
- Chargement carte < 1 sec → Canvas 2D natif (AD-1, pas WebGL overhead)
- Support 10 connexions → VPS sizing, Fastify 2x faster than Express (AD-5)

✅ **NFR6-NFR10 (Fiabilité)** - 100% satisfait
- Détection déconnexion < 5 sec → WebSocket heartbeat
- Resynchronisation < 2 sec → WebSocket reconnection (AD-2)
- Cohérence état → In-memory Map (single source of truth)
- Reconnexion IRC 10 sec → TwitchManager.ts (AD-3)
- Parsing graceful → trim().toUpperCase() tolerant (AD-3)

✅ **NFR11-NFR13 (Twitch)** - 100% satisfait
- Priorité streamer → AD-3 (dual counting: optimiste pour UX, authoritative pour équité)
- Mode anonyme → tmi.js anonymous (AD-3, pas OAuth)
- Parsing tolerant → normalize + case-insensitive (AD-3)

✅ **NFR14-NFR16 (Environnement)** - 100% satisfait
- Navigateurs modernes → ES6+, WebSocket natif, Canvas 2D (pas polyfills)
- Node.js LTS → Node.js 20 LTS (AD-5)
- Config dynamique → .env files + AD-6 (per-room config sans redéploiement)

**Coverage Summary:** 57/57 FRs + 16/16 NFRs = **100% couverture** ✅

---

### Implementation Readiness Validation ✅

**Decision Completeness:**

✅ **16 Architectural Decisions (AD-1 à AD-16)** documentées avec:
- Versions exactes (Vue 3.5, Fastify 5.6, Tailwind 4.1, etc.)
- Rationales explicites
- Implementation patterns
- Code examples
- Impacts analysés

✅ **Implementation Patterns** - 26 conflict points addressed:
- File naming (Vue, TypeScript, tests)
- Code naming (variables, types, Zod schemas)
- WebSocket event naming (namespace:action)
- API endpoint naming (REST conventions)
- Structure patterns (co-located tests, domain components)
- Format patterns (API responses, JSON keys, dates, WebSocket messages)
- Communication patterns (immutable updates, logging levels)
- Process patterns (error handling, loading states, validation)

**Structure Completeness:**

✅ **Project tree 100% défini** avec fichiers spécifiques:
- 3 workspaces (frontend/, backend/, shared/)
- 50+ fichiers frontend mappés aux FRs
- 15+ fichiers backend mappés aux FRs
- 10+ shared files (schemas, types, errors)
- Docker multi-stage builds complets
- Tous les integration points définis

**Pattern Completeness:**

✅ **Pattern Checklist** - 14/14 items définis:
- [x] File names conventions
- [x] Variables/functions naming
- [x] Zod schemas naming
- [x] WebSocket events format
- [x] API endpoints REST
- [x] Tests co-located
- [x] Components by domain
- [x] JSON keys camelCase
- [x] Dates ISO 8601
- [x] State immutable updates
- [x] Error handling try/catch
- [x] Loading states boolean
- [x] Validation client + server
- [x] Logging Pino levels

**AI Agent Readiness:**

✅ Tous les éléments nécessaires pour implementation cohérente:
- Decisions documentées → AI agents savent quoi utiliser
- Patterns documentées → AI agents savent comment implémenter
- Structure documentée → AI agents savent où mettre le code
- Examples + anti-patterns → AI agents évitent les erreurs

---

### Gap Analysis Results

**Critical Gaps:** AUCUN ✅

**Important Gaps:** 2 items (deferred to post-MVP)

1. **Test Infrastructure** - Vitest + Playwright setup
   - Rationale: Defer until core gameplay implemented
   - Mitigation: Manual testing sufficient for 10-user collectif privé
   - Status: NON-BLOQUANT

2. **CI/CD Pipeline** - GitHub Actions
   - Rationale: Manual deployment OK for private app (AD-14)
   - Mitigation: Docker Compose manual deploy simple and reliable
   - Status: NON-BLOQUANT

**Nice-to-Have Gaps:** 1 item (deferred to post-MVP)

1. **Advanced Monitoring** - Prometheus/Grafana
   - Rationale: Health endpoint + structured Pino logs suffisent for 10 users (AD-15)
   - Mitigation: Can add UptimeRobot ping later si nécessaire
   - Status: NON-BLOQUANT

**Conclusion:** Pas de gaps bloquants. Architecture complète et prête pour implémentation.

---

### Validation Issues Addressed

**No Critical Issues Found** ✅

**No Important Issues Found** ✅

**Minor Observations** (non-bloquant):

1. **Audio files non fournis** - Les fichiers .mp3 (theme.mp3, war_theme.mp3, war_horn.mp3, victory.mp3) devront être ajoutés manuellement dans `frontend/public/audio/`
   - Impact: Faible (ajout simple de fichiers statiques)
   - Resolution: Documenté dans structure (FR44-FR49 mapping)

2. **Twitch channel names dynamiques** - Les noms de channels Twitch seront configurés par partie (via twitchUsername des joueurs)
   - Impact: Nul (déjà géré par AD-3 + TwitchManager)
   - Resolution: Déjà documenté dans integration flow

**All Issues Addressed** ✅

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (57 FRs + 16 NFRs)
- [x] Scale and complexity assessed (Medium, ~10 players, Full-Stack Web App)
- [x] Technical constraints identified (Twitch 2-4s delay, état mémoire, 10 players max)
- [x] Cross-cutting concerns mapped (sync temps réel, performance, résilience, équilibrage)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions (AD-1 à AD-16)
- [x] Technology stack fully specified (Vue 3.5, Fastify 5.6, Tailwind 4.1, etc.)
- [x] Integration patterns defined (REST + WebSocket hybrid, Twitch IRC, Howler.js)
- [x] Performance considerations addressed (Canvas 2D, WebSocket natif, Fastify 2x)

**✅ Implementation Patterns**
- [x] Naming conventions established (26 conflict points)
- [x] Structure patterns defined (co-located tests, domain components)
- [x] Communication patterns specified (immutable updates, Pino levels)
- [x] Process patterns documented (error handling, loading, validation)

**✅ Project Structure**
- [x] Complete directory structure defined (100+ files mapped)
- [x] Component boundaries established (API, Component, Service, Data)
- [x] Integration points mapped (REST, WebSocket, Twitch IRC, Howler.js)
- [x] Requirements to structure mapping complete (FR1-FR57 → specific files)

---

### Architecture Readiness Assessment

**Overall Status:** ✅ **READY FOR IMPLEMENTATION**

**Confidence Level:** **HIGH** (100% requirements coverage, no critical gaps, comprehensive patterns)

**Key Strengths:**

1. **Type Safety End-to-End** - Zod schemas + TypeScript types partagés → Zero runtime type errors
2. **Performance Optimized** - Fastify 2x Express, WebSocket natif, Canvas 2D → Satisfait tous les NFRs performance
3. **Developer Experience** - Monorepo workspaces, hot reload, co-located tests → Dev velocity maximale
4. **Comprehensive Patterns** - 26 conflict points addressed → AI agents can implement consistently
5. **Complete FR Mapping** - Chaque FR mappé à des fichiers spécifiques → Aucune ambiguïté d'implémentation
6. **Real-Time Architecture** - Event-sourcing + dual counting + WebSocket < 200ms → Satisfait contraintes Twitch

**Areas for Future Enhancement:**

1. **Test Automation** (post-MVP) - Vitest + Playwright pour tests automatisés
2. **CI/CD Pipeline** (post-MVP) - GitHub Actions si besoin scaling
3. **Advanced Monitoring** (post-MVP) - Prometheus/Grafana si croissance au-delà de 10 users
4. **Internationalization** (post-MVP) - Support multi-langues si expansion hors francophonie

---

### Implementation Handoff

**AI Agent Guidelines:**

- ✅ Follow all architectural decisions exactly as documented (AD-1 à AD-16)
- ✅ Use implementation patterns consistently across all components (26 patterns définis)
- ✅ Respect project structure and boundaries (monorepo, shared types, domain organization)
- ✅ Refer to this document for all architectural questions (single source of truth)

**First Implementation Priority:**

```bash
# Step 1: Initialize monorepo structure
npm init -y
# Configure package.json workspaces: ["frontend", "backend", "shared"]

# Step 2: Setup frontend (Vue 3.5 + Vite 7.2 + TypeScript)
npm create vite@latest frontend -- --template vue-ts
cd frontend && npm install

# Step 3: Setup backend (Fastify 5.6 + TypeScript)
mkdir -p backend/src
cd backend && npm init -y
npm install fastify@^5.6 @fastify/websocket@^11.2 tmi.js@^1.8 pino@^10.1

# Step 4: Setup shared types
mkdir -p shared/src
cd shared && npm init -y
npm install -D typescript@^5.6
npm install zod@^3.23

# Step 5: Configure Docker Compose
# Create docker-compose.yml and docker-compose.prod.yml

# Step 6: Start development
npm run dev  # From root (launches frontend + backend concurrently)
```

**Implementation Sequence** (Critical Path):

1. **Monorepo Setup** → Bloque tout
2. **Shared Zod Schemas** → Bloque API + WebSocket validation
3. **WebSocket Event Types** → Bloque communication frontend/backend
4. **Custom Error Classes** → Bloque error handling
5. **Pinia Stores Setup** → Bloque frontend state management
6. **REST API Endpoints** → Bloque room creation
7. **WebSocket Handlers** → Bloque gameplay
8. **Environment Config** → Bloque deployment
9. **Docker Production Build** → Prêt pour VPS
10. **Manual Deploy** → Collectif testing

---

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-08
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

---

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**

- **16 architectural decisions** made (AD-1 à AD-16)
- **26 implementation patterns** defined (conflict points addressed)
- **3 main workspaces** specified (frontend/, backend/, shared/) avec 100+ fichiers mappés
- **73 requirements** fully supported (57 FRs + 16 NFRs)

**📚 AI Agent Implementation Guide**

- Technology stack with verified versions (Vue 3.5, Fastify 5.6, Tailwind 4.1, etc.)
- Consistency rules that prevent implementation conflicts (naming, structure, patterns)
- Project structure with clear boundaries (monorepo npm workspaces)
- Integration patterns and communication standards (REST + WebSocket hybrid)

---

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing conflict-of-streamers. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**

```bash
# Step 1: Initialize monorepo structure
npm init -y
# Configure package.json workspaces: ["frontend", "backend", "shared"]

# Step 2: Setup frontend (Vue 3.5 + Vite 7.2 + TypeScript)
npm create vite@latest frontend -- --template vue-ts
cd frontend && npm install

# Step 3: Setup backend (Fastify 5.6 + TypeScript)
mkdir -p backend/src
cd backend && npm init -y
npm install fastify@^5.6 @fastify/websocket@^11.2 tmi.js@^1.8 pino@^10.1

# Step 4: Setup shared types
mkdir -p shared/src
cd shared && npm init -y
npm install -D typescript@^5.6
npm install zod@^3.23

# Step 5: Configure Docker Compose
# Create docker-compose.yml and docker-compose.prod.yml

# Step 6: Start development
npm run dev  # From root (launches frontend + backend concurrently)
```

**Development Sequence:**

1. Initialize project using documented starter template (manual structured setup)
2. Set up development environment per architecture (Docker Compose dev)
3. Implement core architectural foundations (shared Zod schemas, WebSocket events, error classes)
4. Build features following established patterns (domain-based stores, co-located tests)
5. Maintain consistency with documented rules (26 implementation patterns)

---

### Quality Assurance Checklist

**✅ Architecture Coherence**

- [x] All decisions work together without conflicts
- [x] Technology choices are compatible (Vue 3.5 + Fastify 5.6 + Zod + TypeScript)
- [x] Patterns support the architectural decisions (immutable updates, event-sourcing, etc.)
- [x] Structure aligns with all choices (monorepo, Docker, domain organization)

**✅ Requirements Coverage**

- [x] All functional requirements are supported (57/57 FRs mapped to specific files)
- [x] All non-functional requirements are addressed (16/16 NFRs satisfied)
- [x] Cross-cutting concerns are handled (error handling, logging, validation, audio)
- [x] Integration points are defined (REST, WebSocket, Twitch IRC, Howler.js)

**✅ Implementation Readiness**

- [x] Decisions are specific and actionable (versions exactes, code examples)
- [x] Patterns prevent agent conflicts (26 conflict points addressed)
- [x] Structure is complete and unambiguous (100+ fichiers définis)
- [x] Examples are provided for clarity (good examples vs anti-patterns)

---

### Project Success Factors

**🎯 Clear Decision Framework**
Every technology choice was made collaboratively with clear rationale, ensuring all stakeholders understand the architectural direction. 16 decisions documented with versions, impacts, and code examples.

**🔧 Consistency Guarantee**
Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly. 26 conflict points addressed with explicit conventions.

**📋 Complete Coverage**
All project requirements are architecturally supported, with clear mapping from business needs to technical implementation. 100% FR + NFR coverage validated.

**🏗️ Solid Foundation**
The chosen manual structured setup and architectural patterns provide a production-ready foundation following current best practices (Vue 3.5, Fastify 5.6, TypeScript, Docker).

---

**Architecture Status:** ✅ **READY FOR IMPLEMENTATION**

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.
