# Story 2.4: Display Game Instructions in Lobby

Status: done

## Story

As a **streamer in the lobby**,
I want **to see game instructions and current game configuration**,
So that **I understand the rules and settings before the game starts (FR11)**.

## Acceptance Criteria

1. **Given** I am in the lobby (as creator or joiner)
   **When** the lobby view loads
   **Then** I see a collapsible instructions section displaying:
   - Brief game instructions explaining how to attack and defend
   - Viewer participation explanation (Twitch chat commands: ATTACK/DEFEND)
   - How the force calculation works (simplified)
   **And** the instructions are visible but collapsible to not overwhelm the UI

2. **Given** I am in the lobby
   **When** I view the game configuration section
   **Then** I see the current game configuration:
   - Battle duration (e.g., "30 secondes")
   - Cooldown between actions (e.g., "10 secondes")
   **And** values are clearly labeled and readable

3. **Given** I am in the lobby
   **When** the lobby content is displayed
   **Then** I see:
   - Game code prominently displayed for sharing (already implemented)
   - List of players with their avatars (already implemented)
   - Instructions section (NEW)
   - Game configuration section (NEW)
   **And** all text is readable for streaming (18px+, high contrast - FR53)

4. **Given** I am on mobile or smaller screens
   **When** viewing the lobby
   **Then** the instructions section remains readable and properly formatted

## Tasks / Subtasks

- [x] Task 1: Create InstructionsCard component (AC: 1, 4)
  - [x] Create `frontend/src/components/lobby/InstructionsCard.vue`
  - [x] Add collapsible header with toggle functionality
  - [x] Display attack/defend instructions in clear format
  - [x] Explain Twitch chat commands (ATTACK [territoire], DEFEND [territoire])
  - [x] Brief explanation of force calculation (simplified for players)
  - [x] Ensure 18px+ text, high contrast (FR53)
  - [x] Add expand/collapse animation with CSS transitions

- [x] Task 2: Create GameConfigCard component (AC: 2)
  - [x] Create `frontend/src/components/lobby/GameConfigCard.vue`
  - [x] Display battle duration with proper formatting
  - [x] Display cooldown between actions with proper formatting
  - [x] Use icons or visual indicators for clarity
  - [x] Read config from lobbyStore.gameConfig

- [x] Task 3: Extend lobbyStore with game config data (AC: 2)
  - [x] Add `gameConfig` computed property to lobbyStore if not present (ALREADY EXISTS)
  - [x] Ensure config is available from room state (battleDuration, cooldownBetweenActions)
  - [x] Provide default values if config not yet loaded

- [x] Task 4: Update LobbyView to include new components (AC: 1, 2, 3)
  - [x] Import InstructionsCard and GameConfigCard
  - [x] Add InstructionsCard between Room Code Header and Players List
  - [x] Add GameConfigCard after Players List
  - [x] Maintain existing layout structure and animations
  - [x] Ensure proper spacing between sections

- [x] Task 5: Build verification
  - [x] Run `npm run build:frontend` - verify no TypeScript errors
  - [x] Visual testing in browser

## Dev Notes

### Critical Architecture Requirements

**FR11 - Display game instructions in lobby:**
- Instructions explain attack/defend mechanics briefly
- Configuration (battle duration, cooldown) visible to all players
- Must not clutter the UI - collapsible is preferred

**FR53 - Streaming readability:**
- All text 18px minimum
- High contrast colors (use existing design system)
- Use `text-lg` or `text-base` Tailwind classes (18px+)

**UXR2 - Accessibility baseline:**
- Focus on streaming readability, not full WCAG
- High contrast for Twitch viewers

### Previous Story Patterns (Story 2.3)

**Reuse from existing code:**
- `lobbyStore.roomData` contains the game configuration via `config` property
- `GameConfig` type from `shared/src/types/room.ts` has `battleDuration` and `cooldownBetweenActions`
- Use existing Card component from `@/components/ui/Card.vue`
- Use existing Tailwind color utilities (text-gray-400, text-white, etc.)

### Component Structure

```vue
<!-- InstructionsCard.vue - Collapsible instructions -->
<script setup lang="ts">
import { ref } from 'vue'
import { Card } from '@/components/ui'

const isExpanded = ref(true)  // Start expanded for first-time visibility

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <Card :padding="'md'" class="animate-fade-in">
    <template #header>
      <button
        @click="toggleExpand"
        class="w-full flex items-center justify-between cursor-pointer"
      >
        <h2 class="text-lg font-semibold text-white">Comment jouer</h2>
        <span class="text-gray-400">{{ isExpanded ? '▲' : '▼' }}</span>
      </button>
    </template>

    <Transition name="collapse">
      <div v-if="isExpanded" class="space-y-4 text-base text-gray-300">
        <!-- Instructions content -->
      </div>
    </Transition>
  </Card>
</template>
```

```vue
<!-- GameConfigCard.vue - Display current config -->
<script setup lang="ts">
import type { GameConfig } from 'shared/types'
import { Card } from '@/components/ui'

const props = defineProps<{
  config: GameConfig
}>()
</script>

<template>
  <Card :padding="'md'" class="animate-fade-in">
    <template #header>
      <h2 class="text-lg font-semibold text-white">Configuration de la partie</h2>
    </template>

    <div class="grid grid-cols-2 gap-4 text-base">
      <div>
        <span class="text-gray-400">Duree des batailles</span>
        <p class="text-xl text-white font-bold">{{ config.battleDuration }}s</p>
      </div>
      <div>
        <span class="text-gray-400">Cooldown entre actions</span>
        <p class="text-xl text-white font-bold">{{ config.cooldownBetweenActions }}s</p>
      </div>
    </div>
  </Card>
</template>
```

### Instructions Content (French)

```markdown
## Comment jouer

**Attaque et Defense:**
- Selectionnez un territoire adjacent pour l'attaquer
- Defendez vos territoires quand ils sont attaques
- Une seule action a la fois par territoire

**Participation des Viewers:**
- Vos viewers Twitch peuvent participer en tapant dans le chat:
  - `ATTACK [nom_territoire]` pour attaquer
  - `DEFEND [nom_territoire]` pour defendre
- Plus il y a de messages + d'utilisateurs uniques, plus la force est elevee

**Calcul de la Force:**
- Force = (Messages × 0.7) + (Utilisateurs uniques × Bonus territoire)
- Les petits territoires ont un bonus de defense
- Les grands territoires ont un bonus d'attaque
```

### LobbyView Integration

```vue
<!-- LobbyView.vue - Updated section order -->
<template>
  <!-- ... existing code ... -->

  <!-- Lobby Content -->
  <div v-else class="space-y-6">
    <!-- Room Code Header (existing) -->
    <Card>...</Card>

    <!-- NEW: Instructions Section -->
    <InstructionsCard />

    <!-- Players List (existing) -->
    <Card>...</Card>

    <!-- NEW: Game Config Section (after Players per Task 4) -->
    <GameConfigCard :config="gameConfig" />

    <!-- Leave Button (existing) -->
  </div>
</template>
```

### Project Structure Notes

**CREATE:**
```
frontend/src/components/lobby/InstructionsCard.vue
frontend/src/components/lobby/GameConfigCard.vue
```

**MODIFY:**
```
frontend/src/views/LobbyView.vue  # Add new components
frontend/src/stores/lobbyStore.ts  # Add gameConfig getter if needed
```

### Testing Checklist

**Visual Verification:**
- [ ] Instructions card is visible on lobby load
- [ ] Instructions can be collapsed/expanded
- [ ] Game config shows correct values (battleDuration, cooldownBetweenActions)
- [ ] All text is 18px+ and readable
- [ ] High contrast maintained (light text on dark background)
- [ ] Animations work smoothly (60 FPS)

**Edge Cases:**
- [ ] Config values display correctly when undefined (show defaults)
- [ ] Instructions collapse state persists during player join/leave events
- [ ] Layout doesn't break with long config values

**Build:**
- [ ] `npm run build:frontend` passes

### References

- [FR11] Display game instructions in lobby
- [FR53] Interface readable for streaming (18px+, high contrast)
- [UXR2] Accessibility baseline - streaming readability focus
- [Project Context] `_bmad-output/project-context.md` - Vue Composition API, Tailwind patterns
- [Previous Stories] `2-3-real-time-lobby-synchronization.md` - LobbyView structure

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Build passed: `npm run build:frontend` - 86 modules transformed, 793ms build time

### Completion Notes List

- **Task 1**: Created InstructionsCard.vue with collapsible functionality, CSS transitions, and comprehensive game instructions in French
- **Task 2**: Created GameConfigCard.vue displaying battleDuration and cooldownBetweenActions with default fallback values
- **Task 3**: lobbyStore already had `config` getter exposing GameConfig - no changes needed
- **Task 4**: Updated LobbyView.vue - imported components, added gameConfig computed, inserted InstructionsCard and GameConfigCard in correct positions
- **Task 5**: Build verification passed - no TypeScript errors

### Change Log

- 2026-01-10: Story 2.4 implementation complete - Instructions and GameConfig cards added to lobby (Claude Opus 4.5)
- 2026-01-10: Code Review fixes applied (Claude Opus 4.5):
  - HIGH-1: Moved GameConfigCard after Players List (was before, spec says after)
  - MED-2: Added icons (⚔️ ⏳) to GameConfigCard for visual clarity
  - MED-3: Added aria-expanded and aria-controls to InstructionsCard toggle
  - MED-4: Documented default values source in GameConfigCard comments
  - Corrected Dev Notes example to match Task 4 spec

### File List

**Created:**
- `frontend/src/components/lobby/InstructionsCard.vue`
- `frontend/src/components/lobby/GameConfigCard.vue`

**Modified:**
- `frontend/src/views/LobbyView.vue`

