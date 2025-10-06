# Conflict of Streamers - Development Guidelines

## Project Overview

**Conflict of Streamers** is a multiplayer territory conquest game designed for Twitch streamers and their communities. The game enables streamers to compete against each other while their chat viewers participate by sending commands to strengthen their streamer's position.

### Concept (French Original)
Le jeu est un jeu de conquête de territoire via le chat Twitch. Deux streamers (ou plus) jouent et demandent à leurs viewers de rentrer des commandes dans le chat pour augmenter leur puissance d'attaque/défense.

### Core Game Mechanics

1. **Lobby Phase**
   - Admin streamer creates a game and configures settings
   - Other streamers join via a 6-character code
   - Each streamer selects a country/territory by clicking on an interactive map
   - Admin launches the game once all players have chosen territories

2. **Battle Phase**
   - Streamers can attack neighboring territories
   - Attack is initiated by clicking on an adjacent country
   - **Attack mechanism**: Attacker's chat spams `!attaque {{country_name}}`
   - **Defense mechanism**: Defender's chat spams `!defend {{country_name}}`
   - Each command increases the respective attack/defense power
   - Attack duration is configurable (default: 30 seconds)

3. **Victory Conditions**
   - To be determined based on game design decisions
   - Possible options: last streamer standing, most territories, highest score

---

## Tech Stack

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Fastify 5.x
- **Real-time Communication**: WebSocket (@fastify/websocket)
- **CORS**: @fastify/cors
- **Environment Configuration**: dotenv

### Frontend
- **Framework**: Vue.js (to be implemented)
- **Map Visualization**: To be determined (see Map Implementation section below)

---

## Architecture

### Backend Structure

```
backend/
├── src/
│   └── server.js              # Main Fastify server, WebSocket setup
├── models/
│   ├── Game.js                # Game state, lobby, territories, attacks
│   └── Player.js              # Player data, Twitch username, scoring
├── .env                       # Environment variables (not in git)
├── .env.example               # Template for environment variables
└── package.json               # Dependencies and scripts
```

#### Key Backend Components

**1. Game Model (`models/Game.js`)**
- **Properties**:
  - `id`: Unique game identifier (UUID)
  - `code`: 6-character join code (alphanumeric)
  - `adminId`: ID of the admin streamer
  - `status`: `'lobby'` | `'playing'` | `'finished'`
  - `settings`: Configurable game parameters
    - `attackDuration`: Duration of an attack in seconds (default: 30)
    - `pointsPerCommand`: Points awarded per chat command (default: 1)
    - `maxPlayers`: Maximum number of streamers (default: 8)
    - `allowDuplicateUsers`: Whether same user can spam multiple times
  - `players`: Array of Player instances
  - `territories`: Map of territory data (id → {ownerId, attackPower, defensePower})
  - `activeAttacks`: Map tracking ongoing attacks
  - `commandCounts`: Map for tracking commands per user (anti-spam)

- **Key Methods**:
  - `generateCode()`: Creates random 6-char code
  - `addPlayer(player)`: Adds player to lobby
  - `removePlayer(playerId)`: Removes player and frees their territory
  - `assignTerritory(playerId, territoryId)`: Assigns territory to player
  - `canStartGame()`: Validates game can start (≥2 players, all have territories)
  - `startGame()`: Transitions from lobby to playing state
  - `endGame()`: Marks game as finished
  - `canPlayerAttack(playerId)`: Checks if player isn't already attacking
  - `isTerritoryUnderAttack(territoryId)`: Checks attack status
  - `addAttack()`, `removeAttack()`, `getActiveAttacks()`: Attack management

**2. Player Model (`models/Player.js`)**
- **Properties**:
  - `id`: Unique player identifier
  - `twitchUsername`: Twitch streamer username
  - `color`: Player color for map visualization (auto-generated)
  - `score`: Current player score
  - `isReady`: Ready status in lobby
  - `territories`: Array of owned territory IDs
  - `isConnected`: WebSocket connection status
  - `joinedAt`: Timestamp of join

- **Methods**:
  - `generateColor()`: Selects from predefined color palette
  - `addScore(points)`: Increments player score

**3. Server (`src/server.js`)**
- Sets up Fastify with logging
- Registers CORS (supports configurable frontend URL)
- Registers WebSocket support
- WebSocket endpoint: `/ws`
- **Note**: `setupWebSocket` function is referenced but not yet implemented

---

### Frontend Structure (To Be Implemented)

```
frontend/
├── src/
│   ├── components/
│   │   ├── Map/                    # Map visualization components
│   │   │   ├── GameMap.vue         # Main map container
│   │   │   ├── Territory.vue       # Individual territory rendering
│   │   │   └── AttackArrow.vue     # Attack direction indicators
│   │   ├── Lobby/
│   │   │   ├── CreateGame.vue      # Admin game creation form
│   │   │   ├── JoinGame.vue        # Join via code form
│   │   │   └── LobbyView.vue       # Lobby with player list
│   │   ├── Game/
│   │   │   ├── GameView.vue        # Main game screen
│   │   │   ├── TerritoryInfo.vue   # Territory stats overlay
│   │   │   └── AttackPanel.vue     # Attack interface
│   │   └── UI/
│   │       ├── PlayerList.vue      # Player roster with colors
│   │       └── GameSettings.vue    # Settings panel
│   ├── stores/                     # Pinia/Vuex state management
│   │   ├── gameStore.js            # Game state
│   │   └── websocketStore.js       # WebSocket connection
│   ├── services/
│   │   ├── websocket.js            # WebSocket client
│   │   └── twitchChat.js           # Twitch chat integration (TMI.js)
│   ├── utils/
│   │   └── mapHelpers.js           # Map geometry utilities
│   └── App.vue
└── package.json
```

---

## Map Implementation Options

The map needs to:
1. Display territories/countries with click interaction
2. Show ownership via player colors
3. Overlay attack/defense points on territories
4. Render attack arrows from attacker to defender
5. Handle adjacency detection (which territories border each other)

### Recommended Solutions

**Option 1: SVG + Vue Components** (Recommended for flexibility)
- Use SVG `<path>` elements for territories
- GeoJSON data for country boundaries (e.g., from Natural Earth or TopoJSON)
- Libraries: `d3-geo`, `d3-zoom` for projections and interactivity
- Full control over rendering and interactions
- Can overlay custom elements (arrows, text, icons) easily

**Option 2: Leaflet.js with GeoJSON**
- Well-established mapping library
- Good for geographic accuracy
- Supports custom layers and markers
- Heavier than pure SVG

**Option 3: Canvas-based (Pixi.js or Fabric.js)**
- High performance for complex animations
- More complex to manage state
- Good if map has many animated elements

**Recommended**: Start with SVG + Vue for maximum flexibility and maintainability.

### Map Data Requirements
- **GeoJSON** file with country/territory polygons
- **Adjacency matrix** or list: which territories border each other
- **Centroid coordinates** for placing labels and stats

---

## WebSocket Communication Protocol

### Message Types (To Be Implemented)

**Client → Server**:
```javascript
// Create game
{ type: 'CREATE_GAME', payload: { twitchUsername, settings } }

// Join game
{ type: 'JOIN_GAME', payload: { code, twitchUsername } }

// Select territory
{ type: 'SELECT_TERRITORY', payload: { gameId, territoryId } }

// Start game (admin only)
{ type: 'START_GAME', payload: { gameId } }

// Initiate attack
{ type: 'ATTACK', payload: { gameId, fromTerritoryId, toTerritoryId } }

// Chat command (from Twitch bot integration)
{ type: 'CHAT_COMMAND', payload: { gameId, command, username, territoryId } }
```

**Server → Client**:
```javascript
// Game created
{ type: 'GAME_CREATED', payload: { game } }

// Game state update
{ type: 'GAME_UPDATE', payload: { game } }

// Player joined
{ type: 'PLAYER_JOINED', payload: { player } }

// Territory claimed
{ type: 'TERRITORY_CLAIMED', payload: { playerId, territoryId } }

// Game started
{ type: 'GAME_STARTED', payload: { game } }

// Attack started
{ type: 'ATTACK_STARTED', payload: { attack } }

// Attack update (real-time point changes)
{ type: 'ATTACK_UPDATE', payload: { territoryId, attackPower, defensePower } }

// Attack ended
{ type: 'ATTACK_ENDED', payload: { territoryId, winner, newOwnerId } }

// Error
{ type: 'ERROR', payload: { message } }
```

---

## Twitch Chat Integration

### Required Implementation

1. **Twitch Bot** (separate service or integrated in backend)
   - Use `tmi.js` library to connect to Twitch chat
   - Monitor multiple channels simultaneously (one per streamer)
   - Parse commands: `!attaque <country>` and `!defend <country>`
   - Send parsed commands to WebSocket server

2. **Authentication Flow**
   - Streamers authenticate via Twitch OAuth
   - Bot joins their channel when they join a game
   - Bot leaves channel when game ends or player disconnects

3. **Anti-Spam Measures**
   - Track commands per user in `commandCounts` Map
   - Implement cooldown if `allowDuplicateUsers: false`
   - Rate limiting to prevent bot abuse

---

## Game Flow State Machine

```
[LOBBY]
  ├─ Admin creates game → LOBBY (waiting for players)
  ├─ Players join via code → LOBBY (players list updates)
  ├─ Players select territories → LOBBY (territories assigned)
  └─ Admin starts game (when all ready) → PLAYING

[PLAYING]
  ├─ Player initiates attack → ATTACK_ACTIVE
  ├─ Chat commands accumulate points → Real-time updates
  ├─ Attack timer expires → Resolve attack outcome
  ├─ Territory changes owner if attacker wins
  ├─ Check victory condition → If met, go to FINISHED
  └─ Continue battles → PLAYING

[FINISHED]
  ├─ Display final scores and map
  └─ Allow rematch or return to lobby
```

---

## Development Priorities

### Phase 1: Core Backend (Partial ✓)
- [x] Game and Player models
- [x] Basic Fastify server setup
- [ ] Complete WebSocket handler implementation
- [ ] Implement WebSocket message routing
- [ ] Add game management logic (create, join, start)
- [ ] Implement attack system with timers

### Phase 2: Twitch Integration
- [ ] Integrate `tmi.js` for Twitch chat
- [ ] Implement OAuth flow for streamers
- [ ] Bot command parsing (!attaque, !defend)
- [ ] Link chat commands to game state

### Phase 3: Frontend Setup
- [ ] Initialize Vue.js project (Vite recommended)
- [ ] Set up routing (vue-router)
- [ ] Set up state management (Pinia recommended)
- [ ] Implement WebSocket client connection

### Phase 4: Map Implementation
- [ ] Choose and implement map rendering solution
- [ ] Load GeoJSON territory data
- [ ] Implement territory selection
- [ ] Territory coloring based on ownership
- [ ] Display attack/defense stats on territories

### Phase 5: Battle Visualization
- [ ] Animate attack arrows
- [ ] Real-time point counters
- [ ] Attack progress indicators
- [ ] Visual feedback for territory capture

### Phase 6: Polish & Testing
- [ ] Error handling and reconnection logic
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Load testing with multiple simultaneous games
- [ ] End-to-end testing

---

## Environment Variables

**Backend (.env)**:
```bash
PORT=3000                                    # Server port
FRONTEND_URL=http://localhost:5173          # CORS origin
TWITCH_CLIENT_ID=your_client_id             # Twitch API
TWITCH_CLIENT_SECRET=your_secret            # Twitch API
BOT_USERNAME=your_bot_username              # Twitch bot account
BOT_OAUTH_TOKEN=oauth:your_token            # Twitch bot OAuth
```

**Frontend (.env)**:
```bash
VITE_WS_URL=ws://localhost:3000/ws          # WebSocket endpoint
VITE_API_URL=http://localhost:3000          # REST API (if used)
```

---

## Code Style & Conventions

### Backend
- Use ES Modules (`import`/`export`)
- Async/await for asynchronous operations
- Classes for models (Game, Player, Attack, etc.)
- Descriptive method names in English
- Comments in English

### Frontend
- Vue 3 Composition API (recommended over Options API)
- TypeScript (optional but recommended for larger project)
- Component names in PascalCase
- Props validation
- Emits declaration

---

## Testing Strategy

### Backend Tests
- Unit tests for Game and Player models
- Integration tests for WebSocket message handling
- Test attack resolution logic
- Test edge cases (disconnections, invalid commands, race conditions)

### Frontend Tests
- Component tests (Vue Test Utils)
- E2E tests (Playwright or Cypress)
- Test user flows: create game → join → select territory → attack

---

## Performance Considerations

1. **WebSocket Scalability**
   - Consider using Redis for pub/sub if scaling to multiple server instances
   - Implement connection pooling

2. **Map Rendering**
   - Use simplified GeoJSON (lower resolution) for performance
   - Implement viewport culling if map is large
   - Debounce zoom/pan events

3. **Real-time Updates**
   - Throttle attack power updates (e.g., send every 100ms, not per command)
   - Use batch updates for multiple territories

4. **Memory Management**
   - Clean up finished games after timeout
   - Implement game history archive if needed

---

## Security Considerations

1. **Authentication**
   - Verify Twitch OAuth tokens
   - Validate user identity before command processing

2. **Authorization**
   - Only admin can start game or modify settings
   - Players can only attack from their own territories
   - Validate territory adjacency server-side

3. **Input Validation**
   - Sanitize all user inputs
   - Validate territory IDs exist
   - Rate limiting on WebSocket messages

4. **Anti-Cheat**
   - Server-side validation of all actions
   - Track command timestamps to detect bots
   - Implement CAPTCHA if bot activity detected

---

## Deployment Recommendations

### Backend
- **Platform**: Heroku, Railway, DigitalOcean, AWS
- **WebSocket support required**
- Enable auto-scaling based on active games

### Frontend
- **Platform**: Vercel, Netlify, Cloudflare Pages
- Static site generation if possible
- CDN for assets

### Database (Future)
- Consider adding PostgreSQL or MongoDB for:
  - Game history
  - Player statistics
  - Leaderboards
  - Persistent user accounts

---

## Known Issues & TODOs

### Critical
- [ ] `setupWebSocket` function is referenced but not implemented in `server.js`
- [ ] No attack resolution logic yet
- [ ] No victory condition implementation
- [ ] No Twitch integration

### Important
- [ ] Frontend directory is empty
- [ ] No map data (GeoJSON) added yet
- [ ] No environment variable documentation in .env.example
- [ ] No tests written

### Nice to Have
- [ ] Spectator mode for non-playing viewers
- [ ] Replay system
- [ ] Tournament bracket system
- [ ] Multiple map options
- [ ] Custom territory creation tool

---

## Useful Resources

### Twitch Integration
- [Twitch Developers Documentation](https://dev.twitch.tv/)
- [tmi.js Documentation](https://github.com/tmijs/tmi.js)
- [Twitch OAuth Guide](https://dev.twitch.tv/docs/authentication)

### Map Data
- [Natural Earth Data](https://www.naturalearthdata.com/) - Free map datasets
- [TopoJSON](https://github.com/topojson/topojson) - Compressed geographic data
- [d3-geo](https://github.com/d3/d3-geo) - Geographic projections

### WebSocket
- [Fastify WebSocket Plugin](https://github.com/fastify/fastify-websocket)
- [WebSocket Protocol RFC](https://tools.ietf.org/html/rfc6455)

### Vue.js
- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia (State Management)](https://pinia.vuejs.org/)
- [VueUse (Composition Utilities)](https://vueuse.org/)

---

## Contact & Collaboration

- Keep code modular and well-documented
- Use feature branches for new functionality
- Write commit messages in English, present tense
- Update this document as architecture evolves

**Date Created**: 2025-10-05  
**Last Updated**: 2025-10-05  
**Project Status**: Early Development (Backend models implemented, WebSocket setup in progress)
