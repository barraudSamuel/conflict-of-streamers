---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
workflowStatus: 'completed'
completedDate: '2026-01-08'
---

# conflict-of-streamers - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for conflict-of-streamers, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Game Setup & Configuration (FR1-FR6):**
- FR1: Le créateur de partie peut créer une nouvelle partie en entrant son pseudo Twitch
- FR2: Le créateur de partie peut configurer les paramètres de jeu (durée batailles, cooldown entre actions)
- FR3: Le système génère un code de partie unique partageable
- FR4: Les joueurs peuvent rejoindre une partie existante en entrant un code de partie et leur pseudo Twitch
- FR5: Le système récupère automatiquement l'avatar Twitch du joueur via son pseudo
- FR6: Le créateur de partie peut modifier les paramètres de jeu dans le lobby avant le lancement

**Lobby & Pre-Game (FR7-FR11):**
- FR7: Les joueurs voient en temps réel les autres joueurs qui rejoignent le lobby avec leurs avatars
- FR8: Les joueurs peuvent sélectionner un territoire de départ sur la grille 20×20
- FR9: Le système affiche les caractéristiques visuelles des territoires (tailles variées, formes organiques)
- FR10: Le créateur de partie peut lancer la partie quand tous les joueurs sont prêts
- FR11: Le système affiche les instructions du jeu dans le lobby

**Twitch Integration (FR12-FR16):**
- FR12: Le système se connecte au chat Twitch du streamer via tmi.js en mode anonyme
- FR13: Le système compte les messages du chat Twitch contenant des commandes valides ("ATTACK [territoire]", "DEFEND [territoire]")
- FR14: Le système identifie les utilisateurs uniques participant via leurs pseudos Twitch
- FR15: Le système gère le délai incompressible de 2-4 secondes du système Twitch IRC
- FR16: Le système maintient la connexion au chat Twitch pendant toute la partie avec reconnexion automatique si nécessaire

**Combat & Gameplay Core (FR17-FR24):**
- FR17: Les joueurs peuvent initier une attaque contre un territoire adjacent en annonçant la cible
- FR18: Les joueurs peuvent défendre leur territoire quand ils sont attaqués
- FR19: Le système empêche un territoire d'être attaqué s'il est lui-même en train d'attaquer OU s'il est déjà en train d'être attaqué
- FR20: Le système limite une bataille à une durée configurable (paramètre ajustable par le créateur de partie)
- FR21: Le système calcule la force d'attaque/défense selon la formule : Force = (messages × 0.7) + (users_uniques × bonus_territoire)
- FR22: Le système applique des stats territoriales inversées (grands territoires = forte attaque/faible défense)
- FR23: Le système détermine le vainqueur d'une bataille selon la force calculée
- FR24: Le système transfère la propriété d'un territoire au vainqueur de la bataille

**Real-Time Feedback & Visualization (FR25-FR29):**
- FR25: Les joueurs voient une barre de progression de bataille mise à jour en temps réel pendant la durée configurée
- FR26: Les joueurs voient un feed de messages en bas à droite affichant les commandes Twitch valides en cours
- FR27: Le système affiche visuellement les pseudos Twitch dans le feed avec un indicateur de validation (background vert)
- FR28: Le système met à jour la grille de jeu en temps réel pour refléter les changements de propriété territoriale
- FR29: Les joueurs voient les actions des autres joueurs en temps réel sur la carte

**Battle Summary & Recognition (FR30-FR33):**
- FR30: Le système affiche un résumé de bataille après chaque combat
- FR31: Le résumé de bataille affiche le top 5 des meilleurs spammers avec leur nombre de messages
- FR32: Le résumé de bataille affiche le pourcentage de participation du chat
- FR33: Le système reconnaît les contributions individuelles des viewers en affichant leurs pseudos dans les leaderboards

**Victory & Game End (FR34-FR37):**
- FR34: Le système détecte la condition de victoire (dernier joueur avec territoires OU conquête totale)
- FR35: Le système affiche un écran de victoire avec les stats finales de la partie
- FR36: Le système affiche le classement final des joueurs
- FR37: Les joueurs peuvent démarrer une nouvelle partie depuis l'écran de victoire

**BOT Territories & Free Zones (FR38-FR40):**
- FR38: Le système gère des territoires BOT (libres) non possédés par des joueurs
- FR39: Les joueurs peuvent attaquer et conquérir des territoires BOT
- FR40: Le système applique une résistance proportionnelle pour les territoires BOT

**Rage-Quit & Player Management (FR41-FR43):**
- FR41: Le système détecte quand un joueur se déconnecte ou quitte la partie
- FR42: Le système libère les territoires d'un joueur déconnecté (deviennent zones BOT)
- FR43: Les joueurs peuvent se reconnecter à une partie en cours

**Audio & Atmosphere (FR44-FR49):**
- FR44: Le système joue une musique épique orchestrale dans le lobby
- FR45: Le système joue une musique de jeu pendant la partie
- FR46: Le système joue une musique de bataille pendant les combats
- FR47: Le système joue des SFX synchronisés (corne de guerre pour début bataille, transitions)
- FR48: Les joueurs peuvent ajuster le volume audio ou couper le son
- FR49: Le système persiste les préférences audio du joueur (LocalStorage)

**Advanced UI & Interaction (FR50-FR53):**
- FR50: Les joueurs peuvent appuyer sur Tab pour afficher/masquer le leaderboard en cours
- FR51: Les joueurs peuvent consulter l'historique des actions effectuées pendant la partie
- FR52: Le système affiche un tutoriel textuel sur la page d'accueil
- FR53: Le système assure une interface lisible pour le streaming (textes 18px+, contrastes forts)

**WebSocket & Real-Time Communication (FR54-FR57):**
- FR54: Le système maintient une connexion WebSocket bidirectionnelle avec latence < 200ms
- FR55: Le système gère les déconnexions WebSocket avec reconnexion automatique
- FR56: Le système maintient l'état du jeu pendant une reconnexion courte
- FR57: Le système synchronise l'état du jeu entre tous les clients connectés en temps réel

### Non-Functional Requirements

**Performance (NFR1-NFR5):**
- NFR1: Le système WebSocket maintient une latence < 200ms pour les événements critiques (attaques, défenses, mise à jour de forces)
- NFR2: L'interface utilisateur réagit aux actions dans < 100ms pour donner un feedback immédiat (highlights visuels, sons)
- NFR3: Le calcul de force des territoires et résolution de bataille s'exécute en < 500ms pour ne pas bloquer le gameplay
- NFR4: L'affichage de la carte 20×20 avec ~20 territoires se charge en < 1 seconde sur connexion moyenne (> 5 Mbps)
- NFR5: Le système gère 10 connexions WebSocket simultanées sans dégradation de performance > 10%

**Fiabilité (NFR6-NFR10):**
- NFR6: Le système détecte les déconnexions WebSocket dans < 5 secondes et tente une reconnexion automatique
- NFR7: En cas de reconnexion d'un joueur, le système resynchronise l'état complet du jeu en < 2 secondes
- NFR8: Le système maintient l'état du jeu en mémoire de façon cohérente même si 1-2 joueurs se déconnectent
- NFR9: Si la connexion IRC Twitch (tmi.js) échoue, le système affiche un message clair et tente de reconnecter toutes les 10 secondes
- NFR10: Le système gère gracefully les messages Twitch malformés ou incomplets sans crasher le serveur

**Intégration Twitch (NFR11-NFR13):**
- NFR11: Le système priorise la réactivité de l'expérience streamer (affichage temps-réel, calculs instantanés) plutôt que d'attendre la synchronisation parfaite avec le chat viewer qui subit le délai IRC Twitch de 2-4 secondes
- NFR12: La connexion IRC via tmi.js en mode anonyme ne nécessite aucune authentification OAuth
- NFR13: Le parsing des commandes chat ("ATTACK", "DEFEND") tolère les variations de casse et espaces (ex: "attack ", "Attack", "ATTACK")

**Compatibilité & Environnement (NFR14-NFR16):**
- NFR14: L'application fonctionne sur Chrome, Firefox, Edge versions récentes (< 2 ans) sans polyfills legacy
- NFR15: Le déploiement VPS supporte Node.js version LTS active et configuration réseau standard
- NFR16: Les paramètres configurables (durée bataille, bonus territoire) sont modifiables sans redéploiement via interface admin

### Additional Requirements

**Architecture Technical Requirements:**

- **AR1 - Starter Template**: Projet initialisé avec setup manuel structuré (Vue 3.5 + Vite 7.2 + TypeScript 5.6 + Tailwind 4.1) frontend et (Fastify 5.6 + TypeScript 5.6) backend en monorepo npm workspaces
- **AR2 - Canvas Rendering**: Utiliser Canvas 2D natif pour le rendu de la grille 20×20 (AD-1 - performance optimale sans dépendance lourde)
- **AR3 - Event-Sourced Sync**: Architecture event-sourcing côté serveur avec State Machine pour validation + Optimistic UI client pour feedback < 100ms (AD-2)
- **AR4 - Dual Counting System**: Implémentation compteur optimiste (UI) + compteur authoritative (serveur) + échantillonnage feed messages (10-15 msg/sec) pour compenser délai Twitch IRC (AD-3)
- **AR5 - Frontend Framework**: Vue 3.5 avec Pinia 3 pour state management et réactivité temps réel (AD-4)
- **AR6 - Backend Architecture**: Fastify 5.6 monolithique modulaire avec WebSocket natif (@fastify/websocket) pour performance < 200ms (AD-5)
- **AR7 - Per-Room Configuration**: Configuration de partie immutable après création, modifiable uniquement entre parties (AD-6)
- **AR8 - Data Validation**: Zod schemas partagés (shared package) pour validation frontend et backend (AD-7)
- **AR9 - Error Handling**: Classes d'erreur typées personnalisées pour gestion erreurs cohérente (AD-8)
- **AR10 - API Architecture**: Hybrid REST + WebSocket - REST pour création/join parties, WebSocket pour gameplay temps réel (AD-9)
- **AR11 - State Management**: Pinia stores organisés par domaine (game, lobby, player) avec composition API (AD-10)
- **AR12 - Routing**: Vue Router 4 en mode history pour navigation SPA (AD-11)
- **AR13 - Environment Configuration**: Variables d'environnement .env pour dev/prod avec validation runtime (AD-12)
- **AR14 - Logging**: Pino 10.1 pour structured logging avec niveaux par environnement (AD-13)
- **AR15 - Deployment**: Docker Compose manuel (multi-stage builds) - pas de CI/CD pour MVP (AD-14)
- **AR16 - Monitoring**: Health endpoint + structured logs Pino pour monitoring (AD-15)
- **AR17 - Shared Types**: Package shared pour types TypeScript partagés (Game, Player, Territory, Battle, WebSocket events)
- **AR18 - Twitch Integration**: tmi.js 1.8 en mode anonyme avec reconnexion automatique toutes les 10 sec
- **AR19 - Audio Management**: Howler.js 2.2 pour gestion audio (musiques orchestrales + SFX) avec persistance préférences LocalStorage
- **AR20 - Infrastructure**: npm workspaces pour monorepo, Docker Compose pour orchestration dev + prod, multi-stage builds pour optimisation

**UX Design Requirements:**

- **UXR1 - Responsive Strategy**: Desktop-first optimisé pour 1920×1080 et 2560×1440 - pas de support mobile/tablet pour MVP
- **UXR2 - Accessibility Baseline**: Pas de conformité WCAG formelle - focus sur lisibilité streaming (textes 18px+, contrastes forts pour viewers Twitch)
- **UXR3 - Browser Support**: Navigateurs modernes uniquement (Chrome, Firefox, Edge, Safari < 2 ans) - pas de polyfills legacy
- **UXR4 - Animation Performance**: Animations fluides 60 FPS pour barres progression, transitions UI, feed messages
- **UXR5 - Interaction Patterns**: Une action à la fois par territoire, Tab pour leaderboard overlay, feed messages temps réel en bas à droite
- **UXR6 - Visual Feedback**: Feedback immédiat < 100ms (highlights visuels, validation commandes background vert/rouge)
- **UXR7 - Error Handling UX**: Messages d'erreur clairs et visuels (déconnexions, commandes invalides, états invalides)
- **UXR8 - Onboarding**: Tutoriel textuel page d'accueil + instructions lobby (apprentissage par observation)
- **UXR9 - Design System**: Style inspiré agar.io - dark background (#0a0a0a), grid subtil (#1a1a1a), neon player colors, overlays semi-transparents
- **UXR10 - Audio UX**: Musiques contextuelles (lobby/jeu/bataille), SFX synchronisés, contrôles volume persistés

### FR Coverage Map

**Epic 1: Project Foundation & Home Page**
- FR52: Tutoriel textuel page d'accueil
- FR53: Interface lisible streaming (textes 18px+, contrastes forts)

**Epic 2: Game Creation & Lobby System**
- FR1: Créer partie avec pseudo Twitch
- FR2: Configurer paramètres jeu (durée batailles, cooldown)
- FR3: Générer code partie unique
- FR4: Rejoindre partie avec code + pseudo
- FR5: Récupération automatique avatar Twitch
- FR6: Modifier paramètres lobby avant lancement
- FR7: Voir autres joueurs temps réel avec avatars
- FR8: Sélectionner territoire départ grille 20×20
- FR9: Afficher caractéristiques territoires (tailles variées, pixel art)
- FR10: Lancer partie quand tous prêts
- FR11: Afficher instructions dans lobby

**Epic 3: Twitch Chat Integration**
- FR12: Connexion chat Twitch via tmi.js mode anonyme
- FR13: Compter messages chat avec commandes valides
- FR14: Identifier utilisateurs uniques via pseudos
- FR15: Gérer délai IRC 2-4 sec (contrainte acceptée)
- FR16: Maintenir connexion + reconnexion auto

**Epic 4: Core Battle System with Real-Time Feedback**
- FR17: Initier attaque territoire adjacent
- FR18: Défendre territoire attaqué
- FR19: Empêcher attaques simultanées (verrous état)
- FR20: Limiter bataille durée configurable
- FR21: Calculer force avec formule proportionnelle
- FR22: Appliquer stats territoriales inversées
- FR23: Déterminer vainqueur bataille
- FR24: Transférer propriété territoire
- FR25: Barre progression temps réel
- FR26: Feed messages bas droite avec commandes valides
- FR27: Afficher pseudos avec validation visuelle (background vert)
- FR28: Mise à jour grille temps réel
- FR29: Voir actions autres joueurs temps réel
- FR30: Afficher résumé bataille
- FR31: Top 5 meilleurs spammers
- FR32: Pourcentage participation chat
- FR33: Reconnaissance contributions viewers
- FR38: Gérer territoires BOT
- FR39: Attaquer/conquérir territoires BOT
- FR40: Résistance proportionnelle BOT

**Epic 5: Victory Conditions & Game Lifecycle**
- FR34: Détecter condition victoire
- FR35: Écran victoire avec stats finales
- FR36: Afficher classement final joueurs
- FR37: Démarrer nouvelle partie
- FR41: Détecter déconnexion joueur
- FR42: Libérer territoires joueur déconnecté
- FR43: Reconnecter joueur en cours partie

**Epic 6: Epic Audio & Atmosphere**
- FR44: Musique orchestrale lobby
- FR45: Musique jeu
- FR46: Musique bataille
- FR47: SFX synchronisés (corne guerre, transitions)
- FR48: Contrôles volume/mute
- FR49: Persistance préférences audio LocalStorage

**Epic 7: Advanced UI Features**
- FR50: Leaderboard overlay avec Tab
- FR51: Historique actions

**WebSocket & Real-Time Communication (FR54-FR57):**
Implémenté progressivement :
- FR54: Connexion WebSocket < 200ms → Epic 1 (setup), Epic 2 (lobby), Epic 4 (battle)
- FR55: Reconnexion auto WebSocket → Epic 2, Epic 4, Epic 5
- FR56: Maintenir état pendant reconnexion → Epic 5
- FR57: Synchroniser état tous clients → Epic 2, Epic 4, Epic 5

**Tous les 57 FRs couverts** ✅

## Epic List

### Epic 1: Project Foundation & Home Page

Les streamers peuvent accéder à l'application et voir une page d'accueil avec un tutoriel textuel simple expliquant les règles.

**FRs couverts:** FR52, FR53
**ARs couverts:** AR1, AR2-AR20 (architecture foundation)
**UXRs couverts:** UXR1-UXR10 (design system)
**NFRs couverts:** NFR14-NFR16

**Notes d'implémentation:**
- Setup monorepo npm workspaces (frontend/backend/shared)
- Frontend: Vue 3.5 + Vite 7.2 + TypeScript 5.6 + Tailwind 4.1
- Backend: Fastify 5.6 + TypeScript 5.6 + WebSocket natif
- Docker Compose pour dev + prod
- Design system agar.io (dark background, grid subtil, neon colors)
- Page d'accueil avec tutoriel = zone de texte simple
- Vue Router 4 pour navigation SPA
- Architecture de base (Pinia stores, shared types, Zod validation, error classes)

---

### Epic 2: Game Creation & Lobby System

Les streamers peuvent créer des parties avec configuration personnalisée, générer un code de partie, rejoindre des lobbies, voir les autres joueurs en temps réel, et sélectionner leur territoire de départ.

**FRs couverts:** FR1-FR11
**ARs couverts:** AR10 (REST API), AR11 (Pinia stores), AR17 (shared types)
**NFRs couverts:** NFR1 (WebSocket < 200ms pour lobby sync)

**Notes d'implémentation:**
- REST API pour création/join parties
- Génération code partie unique partageable
- Configuration flexible (durée batailles, cooldown) modifiable dans lobby
- WebSocket pour synchronisation lobby temps réel
- Récupération automatique avatars Twitch via API publique
- Canvas 2D pour affichage grille 20×20 avec territoires organiques (tailles variées)
- Sélection territoire interactive
- Instructions affichées dans lobby

---

### Epic 3: Twitch Chat Integration

Le système se connecte automatiquement aux chats Twitch des streamers, compte les messages des viewers, identifie les utilisateurs uniques, et maintient la connexion avec reconnexion automatique.

**FRs couverts:** FR12-FR16
**ARs couverts:** AR18 (tmi.js 1.8 anonyme)
**NFRs couverts:** NFR9, NFR11-NFR13

**Notes d'implémentation:**
- Intégration tmi.js en mode anonyme (pas OAuth)
- Connexion automatique au chat Twitch du streamer
- Comptage messages avec commandes valides ("ATTACK [territoire]", "DEFEND [territoire]")
- Parsing tolérant (case-insensitive, trim espaces)
- Identification users uniques via pseudos Twitch
- Reconnexion automatique toutes les 10 sec si échec
- Le délai IRC 2-4 sec est une contrainte technique acceptée

---

### Epic 4: Core Battle System with Real-Time Feedback

Les streamers peuvent attaquer/défendre des territoires, les viewers participent via spam Twitch, voient leur contribution en temps réel (barre progression, feed messages, validation visuelle) grâce au dual counting system, et reçoivent reconnaissance via leaderboards post-bataille.

**FRs couverts:** FR17-FR24, FR25-FR29, FR30-FR33, FR38-FR40
**ARs couverts:** AR2 (Canvas 2D), AR3 (Event-sourcing + State Machine), AR4 (dual counting), AR6 (Fastify WebSocket natif)
**NFRs couverts:** NFR1-NFR5, NFR10, NFR11

**Notes d'implémentation:**

**Combat Core:**
- Attaque/défense territoires adjacents
- Verrous d'état : un territoire ne peut pas attaquer ET être attaqué simultanément
- Durée bataille configurable par créateur partie
- Formule équilibrage : Force = (messages × 0.7) + (users_uniques × bonus_territoire)
- Stats territoriales inversées (grands territoires = forte attaque/faible défense)
- Résolution bataille et transfert propriété
- Gestion territoires BOT avec résistance proportionnelle

**Real-Time Feedback (Dual Counting System):**
- **Compteur optimiste (client)** : Feedback UI < 100ms pour barre progression
- **Compteur authoritative (serveur)** : Calcul final équitable basé sur messages IRC réels
- **Échantillonnage feed** : 10-15 msg/sec pour performance DOM
- Barre progression animée 60 FPS avec couleurs attaquant/défenseur
- Feed messages bas droite avec pseudos Twitch
- Validation visuelle : background vert pour commandes valides
- Mise à jour grille Canvas 2D temps réel
- Actions autres joueurs visibles temps réel

**Battle Summary & Recognition:**
- Résumé post-bataille automatique
- Top 5 meilleurs spammers avec nombre messages
- Pourcentage participation chat
- Reconnaissance contributions individuelles viewers (pseudos visibles)

---

### Epic 5: Victory Conditions & Game Lifecycle

Les parties ont des conditions de victoire claires, affichent un écran de victoire avec stats finales, gèrent les déconnexions/rage-quits, et permettent de relancer une nouvelle partie immédiatement.

**FRs couverts:** FR34-FR37, FR41-FR43
**ARs couverts:** AR7 (per-room config), AR9 (error handling)
**NFRs couverts:** NFR6-NFR8

**Notes d'implémentation:**
- Détection conditions victoire : dernier avec territoires OU conquête totale
- Écran victoire avec stats finales (classement joueurs, territoires conquis, etc.)
- Bouton "Nouvelle Partie" pour enchaîner
- Détection déconnexion < 5 sec
- Rage-quit : territoires libérés deviennent zones BOT
- Reconnexion possible en cours de partie
- Resynchronisation état complet < 2 sec
- Maintien cohérence état en mémoire

---

### Epic 6: Epic Audio & Atmosphere

Le jeu offre une expérience immersive avec musiques orchestrales contextuelles, SFX synchronisés, et contrôles audio persistés.

**FRs couverts:** FR44-FR49
**ARs couverts:** AR19 (Howler.js 2.2)
**NFRs couverts:** NFR2 (audio sync < 100ms)
**UXRs couverts:** UXR10

**Notes d'implémentation:**
- Howler.js pour gestion audio
- Musique orchestrale lobby
- Musique jeu (pendant partie)
- Musique bataille (pendant combats)
- SFX synchronisés : corne de guerre (début bataille), transitions
- Contrôles volume/mute accessibles
- Persistance préférences LocalStorage

---

### Epic 7: Advanced UI Features

Les streamers peuvent afficher le leaderboard en cours avec Tab, consulter l'historique des actions, et bénéficient d'une interface optimisée pour le streaming.

**FRs couverts:** FR50-FR51
**ARs couverts:** AR11 (Pinia stores)
**UXRs couverts:** UXR4-UXR7 (animations 60 FPS, feedback immédiat)
**NFRs couverts:** NFR2 (UI < 100ms)

**Notes d'implémentation:**
- Leaderboard overlay (touche Tab pour show/hide)
- Historique actions consultable
- Animations fluides 60 FPS
- Interface déjà optimisée streaming dans Epic 1 (FR53)

---

## Epic 1: Project Foundation & Home Page

Les streamers peuvent accéder à l'application et voir une page d'accueil avec un tutoriel textuel simple expliquant les règles.

### Story 1.1: Initialize Monorepo Project Structure

As a **developer**,
I want **to initialize the monorepo with npm workspaces (frontend/backend/shared)**,
So that **the project has the correct architecture foundation following AR1**.

**Acceptance Criteria:**

**Given** I am starting a new project
**When** I run the initialization commands
**Then** the monorepo structure is created with:
- Root package.json with workspaces configured
- Frontend workspace (Vue 3.5 + Vite 7.2 + TypeScript 5.6 + Tailwind 4.1)
- Backend workspace (Fastify 5.6 + TypeScript 5.6)
- Shared workspace for TypeScript types
**And** npm install works from root and installs all workspace dependencies
**And** Docker Compose files are configured for dev and prod environments

### Story 1.2: Setup Core Architecture Foundations

As a **developer**,
I want **to implement the core architectural patterns (Zod schemas, error classes, Pinia stores structure, shared types)**,
So that **the codebase follows the architectural decisions AR5-AR17**.

**Acceptance Criteria:**

**Given** the monorepo is initialized
**When** I implement the architecture foundations
**Then** shared package contains:
- Base Zod schemas for validation (AR8)
- Custom typed error classes (AR9)
- Shared TypeScript types structure (AR17)
**And** frontend contains:
- Pinia stores structure organized by domain (AR11)
- Vue Router 4 configured in history mode (AR12)
- Composables structure
**And** backend contains:
- Fastify server setup with @fastify/websocket (AR6)
- Environment configuration with .env validation (AR13)
- Pino structured logging configured (AR14)
- Health endpoint implemented (AR16)

### Story 1.3: Implement Design System and Base UI Components

As a **developer**,
I want **to implement the agar.io-inspired design system with Tailwind CSS 4.1 and base UI components**,
So that **the application has the correct visual foundation following UXR9**.

**Acceptance Criteria:**

**Given** the frontend architecture is setup
**When** I implement the design system
**Then** Tailwind CSS 4.1 is configured with:
- Dark background (#0a0a0a)
- Grid subtil (#1a1a1a)
- 8 neon player colors defined
- Success/danger colors
- Typography with Inter font, 18px minimum (FR53, UXR2)
- 8px base spacing system
**And** base UI components are created:
- Button component
- Card component
- Input component
- Layout components (overlay patterns)
**And** all components are optimized for streaming readability (textes 18px+, contrastes forts)

### Story 1.4: Create Home Page with Tutorial

As a **streamer**,
I want **to see a home page with a simple text tutorial explaining the game rules**,
So that **I understand how to play before creating or joining a game (FR52)**.

**Acceptance Criteria:**

**Given** I navigate to the application root URL
**When** the home page loads
**Then** I see:
- Application title and branding
- Tutorial text zone explaining:
  - How to create a game
  - How to join a game
  - Basic game rules (attack/defend, territories, viewer participation)
  - Commands format (ATTACK/DEFEND [territoire])
- "Créer une Partie" button
- "Rejoindre une Partie" button
**And** the interface is readable for streaming (18px+ text, high contrast - FR53)
**And** the page loads in < 3 seconds (NFR follows from architecture)
**And** navigation works with Vue Router

---

## Epic 2: Game Creation & Lobby System

Les streamers peuvent créer des parties avec configuration personnalisée, générer un code de partie, rejoindre des lobbies, voir les autres joueurs en temps réel, et sélectionner leur territoire de départ.

### Story 2.1: Create Game with Configuration

As a **streamer (game creator)**,
I want **to create a new game by entering my Twitch username and configuring game parameters**,
So that **I can start a custom game session and share the game code with other streamers (FR1-FR3)**.

**Acceptance Criteria:**

**Given** I am on the home page
**When** I click "Créer une Partie"
**Then** I am navigated to a game creation form
**And** I can enter:
- My Twitch username (required)
- Battle duration (configurable, default 30 seconds - FR2)
- Cooldown between actions (configurable, default 10 seconds - FR2)
**When** I submit the form with valid data
**Then** a REST API creates a new game with a unique shareable code (FR3)
**And** I am redirected to the lobby with the game code displayed prominently
**And** my Twitch avatar is automatically fetched and displayed (FR5)
**And** the game configuration is stored in backend memory (AR7 - per-room config)

### Story 2.2: Join Existing Game

As a **streamer (participant)**,
I want **to join an existing game by entering the game code and my Twitch username**,
So that **I can participate in a game created by another streamer (FR4-FR5)**.

**Acceptance Criteria:**

**Given** I am on the home page
**When** I click "Rejoindre une Partie"
**Then** I am prompted to enter:
- Game code (required)
- My Twitch username (required)
**When** I submit with a valid game code
**Then** I am added to the game lobby via REST API
**And** I am redirected to the lobby view
**And** my Twitch avatar is automatically fetched and displayed (FR5)
**When** I submit with an invalid game code
**Then** I see a clear error message (UXR7)

### Story 2.3: Real-Time Lobby Synchronization

As a **streamer in the lobby**,
I want **to see other players join in real-time with their Twitch avatars**,
So that **I know who is participating before the game starts (FR7)**.

**Acceptance Criteria:**

**Given** I am in a game lobby
**When** another player joins the game
**Then** I see their Twitch avatar and username appear in the lobby immediately via WebSocket
**And** the player list updates in real-time without page refresh (FR7, NFR1 < 200ms)
**When** a player leaves the lobby
**Then** their avatar disappears from the lobby in real-time
**And** the WebSocket connection maintains latency < 200ms (NFR1)

### Story 2.4: Display Game Instructions in Lobby

As a **streamer in the lobby**,
I want **to see game instructions and current game configuration**,
So that **I understand the rules and settings before the game starts (FR11)**.

**Acceptance Criteria:**

**Given** I am in the lobby
**When** the lobby view loads
**Then** I see displayed:
- Brief game instructions (how to attack/defend, viewer participation)
- Current game configuration (battle duration, cooldown)
- List of players with their avatars
- Game code for sharing
**And** all text is readable for streaming (18px+, high contrast - FR53)

### Story 2.5: Territory Selection on Grid

As a **streamer in the lobby**,
I want **to select my starting territory from a 20×20 grid with organic territories of varying sizes**,
So that **I can choose my strategic starting position (FR8-FR9)**.

**Acceptance Criteria:**

**Given** I am in the lobby and all players have joined
**When** the territory selection phase begins
**Then** I see a 20×20 grid rendered with Canvas 2D (AR2)
**And** I see ~20 organic territories (each composed of multiple grid cells - FR9)
**And** territories have visually distinct sizes (small, medium, large - FR9)
**When** I click on an available territory
**Then** that territory is highlighted as my selection
**And** other players see my selection in real-time via WebSocket
**When** another player selects a territory
**Then** I see it marked as unavailable in real-time
**And** the grid loads and renders in < 1 second (NFR4)

### Story 2.6: Modify Game Configuration Before Launch

As a **streamer (game creator)**,
I want **to modify game parameters in the lobby before launching the game**,
So that **I can adjust settings based on player feedback (FR6)**.

**Acceptance Criteria:**

**Given** I am the game creator in the lobby
**When** I access game configuration
**Then** I can modify:
- Battle duration
- Cooldown between actions
**And** I cannot modify configuration after the game has started (AR7 - immutable during game)
**When** I save configuration changes
**Then** all players in the lobby see the updated configuration in real-time
**And** the changes are validated and persisted to the game state

### Story 2.7: Launch Game When All Players Ready

As a **streamer (game creator)**,
I want **to launch the game when all players have selected their territories**,
So that **the game can begin (FR10)**.

**Acceptance Criteria:**

**Given** I am the game creator in the lobby
**And** all players have selected their starting territories
**When** I click "Lancer la Partie"
**Then** the game transitions to the active game state
**And** all players are navigated to the game view via WebSocket event
**And** the game configuration becomes immutable (AR7)
**And** the game state is initialized in backend memory
**When** not all players have selected territories
**Then** the "Lancer la Partie" button is disabled
**And** I see a message indicating which players haven't selected yet

---

## Epic 3: Twitch Chat Integration

Le système se connecte automatiquement aux chats Twitch des streamers, compte les messages des viewers, identifie les utilisateurs uniques, et maintient la connexion avec reconnexion automatique.

### Story 3.1: Connect to Twitch Chat via tmi.js

As a **system (backend)**,
I want **to connect to a streamer's Twitch chat channel using tmi.js in anonymous mode**,
So that **I can listen to chat messages without requiring OAuth authentication (FR12, NFR12)**.

**Acceptance Criteria:**

**Given** a game has been created with a streamer's Twitch username
**When** the game initializes
**Then** the backend establishes an IRC connection to that Twitch channel using tmi.js 1.8 (AR18)
**And** the connection is made in anonymous mode (no OAuth required - NFR12)
**And** the connection success is logged via Pino (AR14)
**When** the connection fails
**Then** the system displays a clear error message to the streamer (NFR9)
**And** the system attempts to reconnect (covered in Story 3.4)

### Story 3.2: Parse and Count Valid Chat Commands

As a **system (backend)**,
I want **to parse Twitch chat messages and count valid commands ("ATTACK [territoire]", "DEFEND [territoire]")**,
So that **viewer participation is accurately tracked during battles (FR13, NFR13)**.

**Acceptance Criteria:**

**Given** the system is connected to a Twitch chat
**When** a viewer sends a message containing a valid command
**Then** the system parses the message with case-insensitive matching (NFR13)
**And** the system trims whitespace from the message (NFR13)
**And** the system validates the command format ("ATTACK [territoire]" or "DEFEND [territoire]")
**And** the system increments the message counter for that battle
**When** a viewer sends an invalid or malformed message
**Then** the system handles it gracefully without crashing (NFR10)
**And** the invalid message is ignored (not counted)
**And** no error is shown to viewers (silent filtering)

### Story 3.3: Identify Unique Twitch Users

As a **system (backend)**,
I want **to identify and track unique Twitch users participating in battles via their pseudos**,
So that **the balancing formula can use unique user counts (FR14, FR21)**.

**Acceptance Criteria:**

**Given** the system is receiving valid chat commands during a battle
**When** a user sends their first command
**Then** the system stores their Twitch pseudo as a unique participant
**When** the same user sends additional commands
**Then** the system recognizes them as the same user (no duplicate counting)
**And** the message count increases but unique user count stays the same
**When** the battle ends
**Then** the system can report:
- Total message count
- Total unique user count
**And** these values are used in the balancing formula (FR21)

### Story 3.4: Automatic IRC Reconnection

As a **system (backend)**,
I want **to automatically reconnect to Twitch IRC if the connection drops**,
So that **the game remains functional even with network issues (FR16, NFR9)**.

**Acceptance Criteria:**

**Given** the system is connected to Twitch IRC
**When** the connection drops unexpectedly
**Then** the system detects the disconnection within 5 seconds
**And** the system attempts to reconnect every 10 seconds (NFR9)
**And** the reconnection attempts are logged via Pino
**When** reconnection succeeds
**Then** the system resumes listening to chat messages
**And** a success message is logged
**When** reconnection fails after 3 attempts
**Then** the system continues retrying every 10 seconds
**And** the streamer sees a visual indicator that chat integration is temporarily unavailable (UXR7)
**And** the game continues to function (battles may proceed without viewer input)

### Story 3.5: Fetch Twitch Avatar Automatically

As a **system (backend/frontend)**,
I want **to automatically fetch a streamer's Twitch avatar using their username**,
So that **player avatars are displayed in the lobby and game (FR5, covered here as part of Twitch integration)**.

**Acceptance Criteria:**

**Given** a streamer provides their Twitch username when creating or joining a game
**When** the system processes the username
**Then** the system fetches the avatar URL from Twitch's public API
**And** the avatar is stored in the player's game state
**And** the avatar is sent to all clients via WebSocket for display
**When** the avatar fetch fails (invalid username or API error)
**Then** the system uses a default placeholder avatar
**And** the error is logged but the game continues (graceful degradation)

---

## Epic 4: Core Battle System with Real-Time Feedback

Les streamers peuvent attaquer/défendre des territoires, les viewers participent via spam Twitch, voient leur contribution en temps réel grâce au dual counting system, et reçoivent reconnaissance via leaderboards post-bataille.

### Story 4.1: Render Game Map with Canvas 2D

As a **streamer in game**,
I want **to see the 20×20 grid with all territories rendered in real-time using Canvas 2D**,
So that **I can visualize the game state and make strategic decisions (FR28, AR2, NFR4)**.

**Acceptance Criteria:**

**Given** the game has started
**When** I view the game screen
**Then** I see a fullscreen Canvas 2D rendering the 20×20 grid
**And** I see ~20 organic territories (each composed of multiple grid cells)
**And** each territory is colored according to its owner (neon player colors from design system)
**And** BOT territories (unowned) are displayed in a neutral color (FR38)
**And** the map loads and renders in < 1 second (NFR4)
**And** the Canvas maintains 60 FPS during animations (UXR4)
**And** territory boundaries are clearly visible

### Story 4.2: Initiate Attack on Adjacent Territory

As a **streamer (attacker)**,
I want **to initiate an attack on an adjacent territory by selecting it**,
So that **I can attempt to conquer it and expand my territory (FR17)**.

**Acceptance Criteria:**

**Given** I am in an active game and it's not currently my cooldown period
**When** I click on an adjacent territory
**Then** I can choose to "Attack" that territory
**When** I confirm the attack
**Then** the backend validates via State Machine that:
- The territory is adjacent to mine
- My territory is not currently attacking another territory (FR19)
- My territory is not currently being attacked (FR19)
- The cooldown period has elapsed (10 seconds default)
**And** the battle is initiated with the configured duration (FR20, default 30 seconds)
**And** all clients are notified via WebSocket (NFR1 < 200ms)
**When** validation fails
**Then** I see a clear error message explaining why (UXR7)

### Story 4.3: Defend Territory When Attacked

As a **streamer (defender)**,
I want **to defend my territory when another player attacks it**,
So that **I can rally my viewers to protect my land (FR18)**.

**Acceptance Criteria:**

**Given** another player initiates an attack on my territory
**When** the attack begins
**Then** I receive a WebSocket notification immediately (< 200ms - NFR1)
**And** I see a visual indicator that my territory is under attack
**And** a battle modal/overlay appears showing:
- Attacker name and avatar
- Territory being attacked
- Battle timer (configured duration)
- Current battle status
**And** my viewers can send "DEFEND [territoire]" commands in Twitch chat
**And** the system counts both attack and defense commands

### Story 4.4: Implement Dual Counting System for Real-Time Feedback

As a **viewer participating via Twitch chat**,
I want **to see my contributions reflected immediately in the battle progress bar**,
So that **I feel engaged and know my messages are counting (AR4, NFR2, NFR11)**.

**Acceptance Criteria:**

**Given** a battle is in progress
**When** I send a valid command in Twitch chat
**Then** the frontend receives a WebSocket message with sampled chat data (10-15 msg/sec - AR4)
**And** the optimistic counter on client side increments immediately (< 100ms - NFR2)
**And** the progress bar updates in real-time showing the battle status
**And** the backend maintains an authoritative counter based on all IRC messages received
**When** the battle ends
**Then** the final result is calculated using the authoritative counter (equity guarantee)
**And** the 2-4 second IRC delay is compensated by the dual counting system (AR4, NFR11)
**And** viewers see immediate feedback while final calculation is accurate

### Story 4.5: Display Real-Time Message Feed

As a **viewer participating via Twitch chat**,
I want **to see my pseudo appear in the message feed with visual validation**,
So that **I know my command was recognized (FR26-FR27)**.

**Acceptance Criteria:**

**Given** a battle is in progress
**When** I send a valid command
**Then** my pseudo appears in the message feed at the bottom right of the screen
**And** my message has a green background indicating it was valid (FR27)
**When** I send an invalid command
**Then** my pseudo appears with a red background (optional - visual feedback)
**And** the feed displays a maximum of 10 messages (FIFO - oldest disappear)
**And** the feed updates smoothly with animations (60 FPS - UXR4)
**And** the feed is sampled at 10-15 msg/sec to maintain DOM performance (AR4)
**And** the feed is positioned bottom right, left of the stats sidebar

### Story 4.6: Calculate Battle Force with Balancing Formula

As a **system (backend)**,
I want **to calculate attack and defense force using the proportional balancing formula**,
So that **battles are fair and engagement is rewarded over raw viewer count (FR21-FR22)**.

**Acceptance Criteria:**

**Given** a battle is in progress
**When** the configured battle duration ends (default 30 seconds - FR20)
**Then** the system calculates force for attacker and defender using:
- Force = (messages × 0.7) + (users_uniques × bonus_territoire)
**And** the system applies inversed territorial stats (FR22):
- Large territories: high attack bonus, low defense bonus
- Small territories: low attack bonus, high defense bonus
**And** the calculation completes in < 500ms (NFR3)
**And** the formula uses the authoritative message count from IRC (AR4)

### Story 4.7: Resolve Battle and Transfer Territory

As a **streamer (attacker or defender)**,
I want **to see the battle result and territory ownership change if attack succeeds**,
So that **the game progresses and I can strategize next moves (FR23-FR24)**.

**Acceptance Criteria:**

**Given** a battle has ended and forces have been calculated
**When** the attacker's force is greater than defender's force
**Then** the territory ownership transfers to the attacker (FR24)
**And** the map updates immediately on all clients via WebSocket (FR28, NFR1 < 200ms)
**And** the territory color changes to the attacker's color
**When** the defender's force is greater or equal
**Then** the territory remains with the defender
**And** all clients are notified of the result
**And** the cooldown period begins for the attacking territory (default 10 seconds)

### Story 4.8: Display Battle Summary with Top 5 Leaderboard

As a **viewer who participated**,
I want **to see a battle summary showing the top 5 spammers and my contribution**,
So that **I receive recognition for my participation (FR30-FR33)**.

**Acceptance Criteria:**

**Given** a battle has just ended
**When** the result is determined
**Then** a battle summary modal/overlay appears showing:
- Battle result (attacker won / defender won)
- Top 5 spammers with their pseudo and message count (FR31)
- Total participation percentage of the chat (FR32)
- Total message count and unique user count (FR33)
**And** if I am in the top 5, my pseudo is highlighted
**And** the summary is displayed for 5-10 seconds before auto-closing
**And** the summary is optimized for streaming readability (18px+, high contrast)

### Story 4.9: Manage BOT Territories

As a **streamer**,
I want **to attack and conquer BOT territories (unowned/free zones)**,
So that **I can expand even if no player owns adjacent territories (FR38-FR40)**.

**Acceptance Criteria:**

**Given** there are BOT territories on the map (territories not owned by any player)
**When** I attack a BOT territory
**Then** the battle proceeds as normal (same duration, same UI)
**And** the BOT has no viewers defending (defense force = 0 or proportional resistance - FR40)
**And** the BOT applies a baseline resistance based on territory size:
- Small BOT territories: low resistance
- Large BOT territories: higher resistance (proportional to bonus_territoire)
**When** I win against a BOT
**Then** the territory transfers to me (FR39)
**And** the territory is no longer a BOT territory
**When** a player disconnects (FR42 from Epic 5)
**Then** their territories become BOT territories (handled in Epic 5)

### Story 4.10: Real-Time Game State Synchronization

As a **streamer**,
I want **to see all other players' actions in real-time on the map**,
So that **I can react to the evolving game state strategically (FR29, FR57)**.

**Acceptance Criteria:**

**Given** multiple players are in an active game
**When** any player initiates an attack
**Then** I see a visual indicator on the map showing:
- Which territory is attacking
- Which territory is being attacked
- Battle timer
**And** the update arrives via WebSocket in < 200ms (NFR1)
**When** a battle resolves and territory changes ownership
**Then** I see the map update immediately (FR28)
**And** all clients maintain synchronized game state (FR57, NFR8)
**And** the WebSocket handles 10 simultaneous connections without degradation > 10% (NFR5)

---

## Epic 5: Victory Conditions & Game Lifecycle

Les parties ont des conditions de victoire claires, affichent un écran de victoire avec stats finales, gèrent les déconnexions/rage-quits, et permettent de relancer une nouvelle partie immédiatement.

### Story 5.1: Detect Victory Conditions

As a **system (backend)**,
I want **to detect when a victory condition is met (last player with territories OR total conquest)**,
So that **the game can end and transition to victory screen (FR34)**.

**Acceptance Criteria:**

**Given** an active game is in progress
**When** after a battle resolution, only one player has territories remaining
**Then** the system detects the victory condition immediately
**And** the game state transitions to "ended"
**And** the winning player is identified
**When** one player conquers all territories on the map
**Then** the system detects total conquest victory
**And** the game ends immediately
**When** a victory condition is met
**Then** all clients are notified via WebSocket within 200ms (NFR1)
**And** no more battles can be initiated

### Story 5.2: Detect Player Elimination and Show Loss Screen

As a **streamer**,
I want **to see a loss modal/screen when I lose all my territories and become a spectator**,
So that **I know I'm eliminated but can continue watching the game**.

**Acceptance Criteria:**

**Given** I am an active player in the game
**When** I lose my last territory after a battle
**Then** I am immediately marked as "eliminated"
**And** a loss modal/screen appears showing:
- "Vous avez été éliminé" message
- Player who eliminated me (name and avatar)
- My final stats (territories held, battles won/lost, total participation)
- Current game leaderboard
**And** the modal has a "Continuer en Spectateur" button
**When** I click "Continuer en Spectateur"
**Then** the modal closes
**And** I can view the game map in real-time
**And** I can see ongoing battles
**And** I cannot initiate any actions (no attack/defend buttons)
**And** my avatar is marked as "eliminated" in the player list
**And** the game continues for remaining players

### Story 5.3: Display Differentiated Victory/Defeat Screens

As a **streamer**,
I want **to see a personalized end screen (victory with confetti if I won, defeat screen if I lost)**,
So that **the game ending is celebratory for the winner and clear for everyone else (FR35-FR36)**.

**Acceptance Criteria:**

**Given** a victory condition has been met (one player has all territories OR last player standing)
**When** I am the winner
**Then** I see a victory screen with:
- "Vous avez gagné !" message prominently
- Confetti animation (celebratory visual effect)
- My avatar and name highlighted
- Final leaderboard showing all players ranked (FR36)
- Comprehensive stats (territories conquered, battles won, total viewer participation)
- "Nouvelle Partie" button (FR37)
**When** I am not the winner (eliminated or still playing when game ended)
**Then** I see a defeat screen with:
- "Partie terminée" or "Vous avez perdu" message
- Winner's name and avatar prominently displayed
- Final leaderboard showing my position (FR36)
- Same comprehensive stats
- "Nouvelle Partie" button (if I'm the game creator) or "Attendre l'hôte"
**And** both screens are optimized for streaming (18px+, high contrast)
**And** all screens appear simultaneously via WebSocket

### Story 5.4: Start New Game from End Screen

As a **streamer (game creator)**,
I want **to start a new game immediately from the victory/defeat screen**,
So that **we can play another round without going back to home page (FR37)**.

**Acceptance Criteria:**

**Given** I am on the victory or defeat screen and I am the original game creator
**When** I click "Nouvelle Partie"
**Then** the system creates a new game session
**And** all current players (including spectators/eliminated) are transferred to the new lobby
**And** the game code remains the same (or generates a new one)
**And** eliminated players can rejoin as active players
**And** players can re-select their starting territories
**And** the previous game configuration is preserved (AR7 - can be modified in new lobby)
**When** I am not the game creator
**Then** the "Nouvelle Partie" button is disabled or shows "En attente de l'hôte"

### Story 5.5: Detect Player Disconnection

As a **system (backend)**,
I want **to detect when a player disconnects from the game**,
So that **the game can handle their absence appropriately (FR41, NFR6)**.

**Acceptance Criteria:**

**Given** a player is connected to an active game
**When** their WebSocket connection drops
**Then** the system detects the disconnection within 5 seconds (NFR6)
**And** the disconnection is logged via Pino
**And** other players are notified that the player disconnected
**When** the disconnected player's ongoing battle is interrupted
**Then** the battle resolves based on current counts (or is cancelled)
**And** all clients are updated with the new game state

### Story 5.6: Handle Rage-Quit and Territory Liberation

As a **system**,
I want **to liberate territories of disconnected players and convert them to BOT territories**,
So that **the game continues fairly without the disconnected player (FR42)**.

**Acceptance Criteria:**

**Given** a player has disconnected from the game
**When** the disconnection is confirmed (after 5 seconds - NFR6)
**Then** all territories owned by that player become BOT territories (FR42)
**And** the territories change to neutral BOT color on the map
**And** other players can attack these BOT territories (handled by Epic 4 Story 4.9)
**And** the map updates immediately on all clients via WebSocket
**And** the player's avatar is marked as "disconnected" in the player list
**When** all territories are liberated
**Then** the game checks for victory conditions (might trigger if only 1 player left)

### Story 5.7: Allow Player Reconnection During Game

As a **streamer who temporarily disconnected**,
I want **to reconnect to the game in progress and resume playing**,
So that **a brief connection issue doesn't eliminate me from the game (FR43, NFR7)**.

**Acceptance Criteria:**

**Given** I disconnected from an active game
**When** I reconnect within a reasonable timeframe (e.g., 2 minutes)
**Then** I can rejoin the same game session
**And** the system resynchronizes my game state within 2 seconds (NFR7)
**And** my territories that became BOT are restored to me
**And** I can resume playing normally
**When** I reconnect after my territories were conquered by others
**Then** those territories remain with their new owners (no rollback)
**And** I continue with my remaining territories (if any)
**When** I reconnect after all my territories were lost
**Then** I can spectate but not play

### Story 5.8: Maintain Game State Consistency During Disconnections

As a **system (backend)**,
I want **to maintain consistent game state even when players disconnect**,
So that **the game remains functional and fair (NFR8)**.

**Acceptance Criteria:**

**Given** one or two players disconnect from the game
**When** battles are ongoing
**Then** the game state remains coherent in backend memory (NFR8)
**And** remaining players can continue playing normally
**And** WebSocket broadcasts continue to work for connected players
**When** a player reconnects
**Then** they receive the complete current game state
**And** the state includes:
- Current territory ownership
- Ongoing battles status
- Player statuses (connected/disconnected/eliminated)
- Cooldown timers
**And** the resynchronization completes in < 2 seconds (NFR7)

---

## Epic 6: Epic Audio & Atmosphere

Le jeu offre une expérience immersive avec musiques orchestrales contextuelles, SFX synchronisés, et contrôles audio persistés.

### Story 6.1: Implement Howler.js Audio Manager

As a **developer**,
I want **to implement a centralized audio manager using Howler.js 2.2**,
So that **audio playback is reliable and performant across the application (AR19)**.

**Acceptance Criteria:**

**Given** the frontend architecture is setup
**When** I implement the audio manager
**Then** Howler.js 2.2 is installed and configured
**And** a composable `useAudioManager` is created with methods:
- `playMusic(track)` - Play background music with loop
- `stopMusic()` - Stop current music
- `playSFX(sound)` - Play one-shot sound effect
- `setVolume(level)` - Set master volume (0-100)
- `mute()` / `unmute()` - Toggle mute state
**And** the audio manager preloads all audio assets on app initialization
**And** audio playback is synchronized with events (< 100ms latency - NFR2)

### Story 6.2: Contextual Music System

As a **streamer**,
I want **to hear different orchestral music tracks based on game phase (lobby/game/battle)**,
So that **the atmosphere matches the current game state (FR44-FR46, UXR10)**.

**Acceptance Criteria:**

**Given** I am in the application
**When** I am in the lobby
**Then** I hear the lobby orchestral music playing in loop (FR44)
**When** the game starts
**Then** the lobby music fades out
**And** the game music starts playing in loop (FR45)
**When** a battle begins
**Then** the game music fades out
**And** the battle music starts playing in loop (FR46)
**When** the battle ends
**Then** the battle music fades out
**And** the game music resumes
**When** the game ends (victory/defeat)
**Then** the music transitions to a victory or defeat track (optional enhancement)
**And** all music transitions are smooth (no abrupt cuts)

### Story 6.3: Synchronized Sound Effects

As a **streamer**,
I want **to hear synchronized sound effects during key game events**,
So that **the game feels more immersive and impactful (FR47, NFR2)**.

**Acceptance Criteria:**

**Given** the audio manager is implemented
**When** a battle begins
**Then** I hear a "corne de guerre" (war horn) SFX synchronized with the battle start (FR47)
**And** the SFX plays within 100ms of the event (NFR2)
**When** a battle ends
**Then** I hear a victory or defeat SFX based on the result
**When** I transition between screens (home → lobby → game)
**Then** I hear subtle transition SFX (FR47)
**When** a territory is conquered
**Then** I hear a conquest SFX
**And** all SFX are properly synchronized with visual events
**And** SFX volume is independently controllable from music volume

### Story 6.4: Audio Controls with Persistence

As a **streamer**,
I want **to adjust audio volume or mute all sounds, and have my preferences saved**,
So that **I can control audio during streaming and it persists across sessions (FR48-FR49)**.

**Acceptance Criteria:**

**Given** I am in the application
**When** I access audio controls (e.g., settings icon or in-game menu)
**Then** I see controls for:
- Master volume slider (0-100%)
- Music volume slider (0-100%)
- SFX volume slider (0-100%)
- Mute toggle button
**When** I adjust any audio setting
**Then** the change is applied immediately
**And** the setting is saved to LocalStorage (FR49)
**When** I reload the page or rejoin later
**Then** my audio preferences are restored from LocalStorage
**And** the audio manager applies my saved settings automatically
**When** I mute audio
**Then** all sounds (music + SFX) are silenced
**And** the mute state is also persisted

---

## Epic 7: Advanced UI Features

Les streamers peuvent afficher le leaderboard en cours avec Tab, consulter l'historique des actions, et bénéficient d'une interface optimisée pour le streaming.

### Story 7.1: Tab Key Overlay with Leaderboard and Action History

As a **streamer**,
I want **to press Tab to show/hide an overlay displaying both the current leaderboard and action history**,
So that **I can check standings and review what happened without blocking my view (FR50-FR51)**.

**Acceptance Criteria:**

**Given** I am in an active game
**When** I press the Tab key
**Then** an overlay appears smoothly (60 FPS animation - UXR4)
**And** the overlay is divided into two sections:

**Section 1 - Leaderboard (top or left):**
- Current player rankings (ordered by territory count)
- Each player's name, avatar, and territory count
- Eliminated players marked clearly
- My position highlighted
- Updates in real-time as territories change

**Section 2 - Action History (bottom or right):**
- Scrollable list of game actions showing:
  - Timestamp (relative time - "2 min ago")
  - Player name and avatar
  - Action type (attacked, defended, conquered, eliminated)
  - Territory involved
  - Battle result (won/lost)
- Most recent actions at the top
- Stored in Pinia store (AR11)
- Updates in real-time as new actions occur

**When** I release the Tab key (or press it again)
**Then** the overlay fades out smoothly
**And** the overlay does not block critical game UI elements
**And** the overlay responds within 100ms of key press (NFR2)
**And** the overlay is optimized for streaming (18px+, high contrast)
**When** the game ends
**Then** the action history is cleared for the next game
