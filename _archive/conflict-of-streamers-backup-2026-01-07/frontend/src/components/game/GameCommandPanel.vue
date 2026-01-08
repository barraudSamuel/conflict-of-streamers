<script setup lang="ts">
import {computed, toRefs} from 'vue'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Swords, OctagonX, Shield, OctagonMinus} from 'lucide-vue-next'
import GameCommandCenterCard from '@/components/game/GameCommandCenterCard.vue'
import GameCommandSideCard from '@/components/game/GameCommandSideCard.vue'
import type {
  AttackStats,
  BattleBalance,
  ReinforcementStats
} from '@/types/game'

const props = defineProps<{
  currentAttack: any | null
  defendingAttack: any | null
  currentAttackStats: AttackStats | null
  defendingAttackStats: AttackStats | null
  currentReinforcementStats: ReinforcementStats | null
  currentAttackEncouragement: string
  defendingEncouragement: string
  attackCommandLabel: string
  defenseCommandLabel: string
  reinforcementCommandLabel: string
  attackWindowLabel: string
  reinforcementWindowLabel: string
  attackError: string
  reinforcementError: string
  showAttackActions: boolean
  showReinforcementActions: boolean
  attackCtaEnabled: boolean
  reinforcementCtaEnabled: boolean
  attackLoading: boolean
  reinforcementLoading: boolean
  cancelAttackLoading: boolean
  cancelReinforcementLoading: boolean
  selectedOwnedTerritory: any | null
  targetTerritory: any | null
  selectedReinforcement: any | null
  currentAttackBalance: BattleBalance
  defendingAttackBalance: BattleBalance
  formatDuration: (seconds: number) => string
  getPlayerUsername: (id?: string | null) => string | null
  cancelSelection: () => void
  launchAttack: () => void
  cancelCurrentAttack: () => void
  launchReinforcement: () => void
  cancelCurrentReinforcement: () => void
  attackDisabledReason: string | null
  reinforcementDisabledReason: string | null
}>()

const {
  currentAttack,
  defendingAttack,
  currentAttackStats,
  defendingAttackStats,
  currentReinforcementStats,
  currentAttackEncouragement,
  defendingEncouragement,
  attackCommandLabel,
  reinforcementCommandLabel,
  attackWindowLabel,
  reinforcementWindowLabel,
  attackError,
  reinforcementError,
  showAttackActions,
  showReinforcementActions,
  attackCtaEnabled,
  reinforcementCtaEnabled,
  attackLoading,
  reinforcementLoading,
  cancelAttackLoading,
  cancelReinforcementLoading,
  selectedOwnedTerritory,
  targetTerritory,
  selectedReinforcement,
  currentAttackBalance,
  defendingAttackBalance,
  formatDuration,
  getPlayerUsername,
  cancelSelection,
  launchAttack,
  cancelCurrentAttack,
  launchReinforcement,
  cancelCurrentReinforcement,
  attackDisabledReason,
  reinforcementDisabledReason
} = toRefs(props)

const attackCTAEnabled = attackCtaEnabled
const reinforcementCTAEnabled = reinforcementCtaEnabled

const attackDisabledMessage = computed(() => {
  switch (attackDisabledReason.value) {
    case 'validation':
      return 'Validation de la requête en cours...'
    case 'no-player':
      return 'Session joueur introuvable.'
    case 'attack-in-progress':
      return 'Une attaque est déjà en cours.'
    case 'no-origin':
      return 'Sélectionnez d\'abord l\'un de vos territoires.'
    case 'no-target':
      return 'Choisissez une cible adverse.'
    case 'origin-reinforcement':
      return 'Ce territoire est en renfort. Attendez la fin avant d\'attaquer.'
    case 'origin-under-attack':
      return 'Ce territoire est en défense et ne peut pas attaquer.'
    case 'origin-attacking':
      return 'Ce territoire mène déjà une attaque.'
    case 'target-owned':
      return 'Vous possédez déjà cette cible.'
    case 'target-under-attack':
      return 'La cible est déjà sous attaque.'
    case 'target-attacking':
      return 'La cible participe déjà à une attaque.'
    case 'not-neighbor':
      return 'La cible doit être limitrophe.'
    default:
      return null
  }
})

const reinforcementDisabledMessage = computed(() => {
  switch (reinforcementDisabledReason.value) {
    case 'validation':
      return 'Validation de la requête en cours...'
    case 'no-player':
      return 'Session joueur introuvable.'
    case 'no-territory':
      return 'Sélectionnez d\'abord l\'un de vos territoires.'
    case 'not-owner':
      return 'Ce territoire ne vous appartient plus.'
    case 'under-attack':
      return 'Impossible pendant une attaque sur ce territoire.'
    case 'attacking':
      return 'Impossible pendant une attaque lancée depuis ce territoire.'
    case 'already-reinforcing':
      return 'Un renfort est déjà en cours ici.'
    case 'other-reinforcement-active':
      return 'Terminez votre autre renfort avant d\'en lancer un nouveau.'
    default:
      return null
  }
})

function getParticipantTotal(attack: any, role: 'attackers' | 'defenders'): number {
  if (!attack || typeof attack !== 'object') return 0
  const count = attack?.participantCount?.[role]
  if (typeof count === 'number' && Number.isFinite(count)) {
    return count
  }
  const fallbackKey = role === 'attackers' ? 'participantAttackers' : 'participantDefenders'
  const fallback = attack?.[fallbackKey]
  return Array.isArray(fallback) ? fallback.length : 0
}

function getMessageTotal(attack: any, field: 'attackMessages' | 'defenseMessages'): number {
  if (!attack || typeof attack !== 'object') return 0
  const raw = Number(attack?.[field])
  return Number.isFinite(raw) ? raw : 0
}

function isBotPlayer(playerId?: string | null): boolean {
  if (typeof playerId !== 'string') return false
  const normalized = playerId.trim().toLowerCase()
  return normalized.startsWith('bot:') || normalized === 'faction ia'
}

interface Fact {
  label: string
  value: string
  accent?: boolean
}

const reinforcementDetails = computed(() => {
  if (currentReinforcementStats.value) {
    return currentReinforcementStats.value.reinforcement
  }
  return selectedReinforcement.value ?? null
})

const reinforcementTargetName = computed(() => {
  return (
    reinforcementDetails.value?.territoryName ??
    reinforcementDetails.value?.territoryId ??
    selectedOwnedTerritory.value?.name ??
    'Territoire'
  )
})

const attackFacts = computed<Fact[]>(() => {
  if (!showAttackActions.value) return []
  const facts: Fact[] = []
  facts.push({
    label: 'Territoire source',
    value: selectedOwnedTerritory.value?.name ?? 'Non sélectionné'
  })
  facts.push({
    label: 'Cible',
    value: targetTerritory.value?.name ?? 'Non sélectionnée'
  })
  facts.push({
    label: 'Fenêtre d\'action',
    value: attackWindowLabel.value
  })
  return facts
})

const reinforcementFacts = computed<Fact[]>(() => {
  if (!showReinforcementActions.value) return []
  const facts: Fact[] = [
    {
      label: 'Territoire ciblé',
      value: reinforcementTargetName.value
    }
  ]

  const windowLabel = currentReinforcementStats.value
    ? formatDuration.value(currentReinforcementStats.value.remaining)
    : reinforcementWindowLabel.value
  facts.push({
    label: 'Fenêtre d\'action',
    value: windowLabel
  })

  if (selectedOwnedTerritory.value) {
    const defenseValue = String(selectedOwnedTerritory.value.defensePower ?? 0)
    facts.push({
      label: 'Défense actuelle',
      value: defenseValue
    })
  }

  return facts
})

const currentDefenseMessages = computed(() =>
  getMessageTotal(currentAttackStats.value?.attack, 'defenseMessages')
)

const currentDefenseParticipants = computed(() =>
  getParticipantTotal(currentAttackStats.value?.attack, 'defenders')
)

const attackOverflowCount = computed(() => {
  const stats = currentAttackStats.value
  if (!stats) return 0
  const total = Number(stats.participants) || 0
  const visible = Array.isArray(stats.topAttackers) ? stats.topAttackers.length : 0
  return Math.max(0, total - visible)
})

const defenseOverflowCount = computed(() => {
  const stats = currentAttackStats.value
  if (!stats) return 0
  const total = getParticipantTotal(stats.attack, 'defenders')
  const visible = Array.isArray(stats.topDefenders) ? stats.topDefenders.length : 0
  return Math.max(0, total - visible)
})

const defendingAttackMessages = computed(() =>
  getMessageTotal(defendingAttackStats.value?.attack, 'attackMessages')
)

const defendingAttackParticipants = computed(() =>
  getParticipantTotal(defendingAttackStats.value?.attack, 'attackers')
)

const defendingAttackOverflowCount = computed(() => {
  const stats = defendingAttackStats.value
  if (!stats) return 0
  const total = getParticipantTotal(stats.attack, 'attackers')
  const visible = Array.isArray(stats.topAttackers) ? stats.topAttackers.length : 0
  return Math.max(0, total - visible)
})

const defendingDefenseOverflowCount = computed(() => {
  const stats = defendingAttackStats.value
  if (!stats) return 0
  const total = Number(stats.participants) || 0
  const visible = Array.isArray(stats.topDefenders) ? stats.topDefenders.length : 0
  return Math.max(0, total - visible)
})

const showReinforcementWarning = computed(
  () =>
    !reinforcementCTAEnabled.value &&
    reinforcementDisabledReason.value !== 'already-reinforcing' &&
    reinforcementDisabledMessage.value
)

</script>

<template>
  <Card class="pointer-events-auto mx-auto mb-6 w-full max-w-6xl bg-card/70 ring-1 ring-white/10 backdrop-blur">
    <CardHeader>
      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <CardTitle class="flex items-center gap-2 font-semibold uppercase tracking-wide text-slate-200">
            <Swords class="size-5 text-primary"/>
            <span v-if="currentAttackStats">Attaque en cours</span>
            <span v-else-if="defendingAttackStats">Défense en direct</span>
            <span v-else>Commandes de jeu</span>
          </CardTitle>
          <Button
              v-if="currentAttackStats"
              variant="destructive"
              size="sm"
              class="pointer-events-auto"
              :disabled="cancelAttackLoading"
              @click="cancelCurrentAttack"
          >
            <OctagonX class="size-4"/>
            <span v-if="cancelAttackLoading">Annulation...</span>
            <span v-else>Annuler l'attaque</span>
          </Button>
        </div>
        <CardDescription class="text-xs text-slate-400">
          <span v-if="currentAttackStats">Fenêtre d'action : {{ attackWindowLabel }}</span>
          <span v-else-if="defendingAttackStats">Mobilisez votre communauté pour tenir la ligne.</span>
          <span v-else>Sélectionnez un territoire pour lancer l'offensive.</span>
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent class="space-y-6">
      <template v-if="currentAttackStats">
        <div class="space-y-8">
          <div class="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)_minmax(0,1fr)]">
            <GameCommandSideCard
                title="Attaque"
                :name="getPlayerUsername(currentAttack?.attackerId) ?? 'Vos troupes'"
                :subtitle="`Depuis ${currentAttack?.fromTerritoryName ?? currentAttack?.fromTerritory ?? 'Territoire'}`"
                :supporters="currentAttackStats.topAttackers ?? []"
                :overflow-count="attackOverflowCount"
            >
              <div class="flex items-center justify-between text-sm text-slate-400">
                <span>Puissance attaque</span>
                <span class="text-lg font-semibold text-slate-100">{{ currentAttackStats.attackPoints }}</span>
              </div>
              <div class="relative h-5 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                    class="absolute inset-y-0 left-0 rounded-r-full bg-primary transition-all duration-500"
                    :style="{ width: `${Math.max(4, currentAttackBalance.attackPercent)}%` }"
                ></div>
              </div>
              <p class="text-sm text-slate-400">
                {{ currentAttackStats.messages }} message<span v-if="currentAttackStats.messages !== 1">s</span>
                • {{ currentAttackStats.participants }} supporter<span v-if="currentAttackStats.participants !== 1">s</span>
              </p>
            </GameCommandSideCard>
            <GameCommandCenterCard
                :countdown="formatDuration(currentAttackStats.remaining)"
                :encouragement="currentAttackEncouragement"
            />
            <GameCommandSideCard
                title="Défense"
                align="right"
                :name="getPlayerUsername(currentAttack?.defenderId) ?? 'Défenseur'"
                :subtitle="`Sur ${currentAttack?.toTerritoryName ?? currentAttack?.toTerritory ?? 'Territoire'}`"
                :supporters="currentAttackStats.topDefenders ?? []"
                :overflow-count="defenseOverflowCount"
                supporter-badge-class="bg-amber-400"
            >
              <div class="flex items-center justify-between text-sm text-slate-400">
                <span>Puissance défense</span>
                <span class="text-lg font-semibold text-slate-100">{{ currentAttackStats.defensePoints }}</span>
              </div>
              <div class="relative h-5 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                    class="absolute inset-y-0 right-0 rounded-l-full bg-amber-400 transition-all duration-500"
                    :style="{ width: `${Math.max(4, currentAttackBalance.defensePercent)}%` }"
                ></div>
              </div>
              <p
                  v-if="!isBotPlayer(currentAttack?.defenderId)"
                  class="text-sm text-right text-slate-400"
              >
                {{ currentDefenseMessages }} message<span v-if="currentDefenseMessages !== 1">s</span>
                • {{ currentDefenseParticipants }} défenseur<span v-if="currentDefenseParticipants !== 1">s</span>
              </p>
            </GameCommandSideCard>
          </div>
          <div
              v-if="currentReinforcementStats"
              class="space-y-4 rounded-2xl border border-sky-500/40 bg-slate-900/70 p-6 ring-1 ring-sky-500/20"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-sm uppercase tracking-[0.3em] text-slate-500">Renfort sur</p>
                <p class="text-2xl font-semibold text-slate-100">
                  {{
                    currentReinforcementStats.reinforcement.territoryName ??
                    currentReinforcementStats.reinforcement.territoryId
                  }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm uppercase tracking-[0.3em] text-slate-500">Temps restant</p>
                <p class="text-2xl font-semibold text-sky-300 drop-shadow">
                  {{ formatDuration(currentReinforcementStats.remaining) }}
                </p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-4 text-sm text-slate-300">
              <span>Messages
                <span class="font-semibold text-slate-100">{{ currentReinforcementStats.messages }}</span>
              </span>
              <span>Participants
                <span class="font-semibold text-slate-100">{{ currentReinforcementStats.participants }}</span>
              </span>
              <span>Défense actuelle
                <span class="font-semibold text-slate-100">{{ currentReinforcementStats.accumulatedBonus }}</span>
              </span>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs text-slate-400">
                Votre chat peut spammer
                <span class="font-mono text-primary">
                  {{ reinforcementCommandLabel || '!renfort <pays>' }}
                </span>
                pour booster la défense.
              </p>
              <Button
                  variant="outline"
                  size="sm"
                  class="pointer-events-auto"
                  :disabled="cancelReinforcementLoading"
                  @click="cancelCurrentReinforcement"
              >
                <OctagonX class="size-4"/>
                <span v-if="cancelReinforcementLoading">Annulation...</span>
                <span v-else>Annuler le renfort</span>
              </Button>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="defendingAttackStats">
        <div class="space-y-8">
          <div class="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)_minmax(0,1fr)]">
            <GameCommandSideCard
                title="Attaque"
                :name="getPlayerUsername(defendingAttack?.attackerId) ?? 'Attaquant'"
                :subtitle="`Depuis ${defendingAttack?.fromTerritoryName ?? defendingAttack?.fromTerritory ?? 'Territoire'}`"
                :supporters="defendingAttackStats.topAttackers ?? []"
                :overflow-count="defendingAttackOverflowCount"
            >
              <div class="flex items-center justify-between text-sm text-slate-400">
                <span>Puissance attaque</span>
                <span class="text-lg font-semibold text-slate-100">{{ defendingAttackStats.attackPoints }}</span>
              </div>
              <div class="relative h-5 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                    class="absolute inset-y-0 left-0 rounded-r-full bg-primary/80 transition-all duration-500"
                    :style="{ width: `${Math.max(4, defendingAttackBalance.attackPercent)}%` }"
                ></div>
              </div>
              <p class="text-sm text-slate-400">
                {{ defendingAttackMessages }} message<span v-if="defendingAttackMessages !== 1">s</span>
                • {{ defendingAttackParticipants }} attaquant<span v-if="defendingAttackParticipants !== 1">s</span>
              </p>
            </GameCommandSideCard>
            <GameCommandCenterCard
                :countdown="formatDuration(defendingAttackStats.remaining)"
                :encouragement="defendingEncouragement"
                encouragement-class="text-emerald-300 drop-shadow-lg"
            />
            <GameCommandSideCard
                title="Défense"
                align="right"
                :name="getPlayerUsername(defendingAttack?.defenderId) ?? 'Défenseur'"
                :subtitle="`Sur ${defendingAttack?.toTerritoryName ?? defendingAttack?.toTerritory ?? 'Territoire'}`"
                :supporters="defendingAttackStats.topDefenders ?? []"
                :overflow-count="defendingDefenseOverflowCount"
                supporter-badge-class="bg-emerald-400"
            >
              <div class="flex items-center justify-between text-sm text-slate-400">
                <span>Puissance défense</span>
                <span class="text-lg font-semibold text-slate-100">{{ defendingAttackStats.defensePoints }}</span>
              </div>
              <div class="relative h-5 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                    class="absolute inset-y-0 right-0 rounded-l-full bg-emerald-400 transition-all duration-500"
                    :style="{ width: `${Math.max(4, defendingAttackBalance.defensePercent)}%` }"
                ></div>
              </div>
              <p
                  v-if="!isBotPlayer(defendingAttack?.defenderId)"
                  class="text-sm text-right text-slate-400"
              >
                {{ defendingAttackStats.messages }} message<span v-if="defendingAttackStats.messages !== 1">s</span>
                • {{ defendingAttackStats.participants }} défenseur<span v-if="defendingAttackStats.participants !== 1">s</span>
              </p>
            </GameCommandSideCard>
          </div>
          <div
              v-if="currentReinforcementStats"
              class="space-y-4 rounded-2xl border border-sky-500/40 bg-slate-900/70 p-6 ring-1 ring-sky-500/20"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-sm uppercase tracking-[0.3em] text-slate-500">Renfort sur</p>
                <p class="text-2xl font-semibold text-slate-100">
                  {{
                    currentReinforcementStats.reinforcement.territoryName ??
                    currentReinforcementStats.reinforcement.territoryId
                  }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm uppercase tracking-[0.3em] text-slate-500">Temps restant</p>
                <p class="text-2xl font-semibold text-sky-300 drop-shadow">
                  {{ formatDuration(currentReinforcementStats.remaining) }}
                </p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-4 text-sm text-slate-300">
              <span>Messages
                <span class="font-semibold text-slate-100">{{ currentReinforcementStats.messages }}</span>
              </span>
              <span>Participants
                <span class="font-semibold text-slate-100">{{ currentReinforcementStats.participants }}</span>
              </span>
              <span>Défense actuelle
                <span class="font-semibold text-slate-100">{{ currentReinforcementStats.accumulatedBonus }}</span>
              </span>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-slate-400">
                Votre chat peut spammer
                <span class="font-medium text-primary">
                  {{ reinforcementCommandLabel || '!renfort <pays>' }}
                </span>
                pour booster la défense.
              </p>
              <Button
                  variant="outline"
                  size="sm"
                  class="pointer-events-auto"
                  :disabled="cancelReinforcementLoading"
                  @click="cancelCurrentReinforcement"
              >
                <OctagonX class="size-4"/>
                <span v-if="cancelReinforcementLoading">Annulation...</span>
                <span v-else>Annuler le renfort</span>
              </Button>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div
            v-if="showAttackActions || showReinforcementActions"
            class="overflow-hidden rounded-xl border border-white/10 bg-accent/60"
        >
          <div
              v-if="showAttackActions"
              class="space-y-4 p-4"
              :class="showReinforcementActions ? 'pb-6' : ''"
          >
            <div class="space-y-3 text-sm text-slate-300">
              <ul class="grid gap-3 sm:grid-cols-3">
                <li
                    v-for="fact in attackFacts"
                    :key="fact.label"
                    class="rounded-lg border border-white/10 bg-slate-900/50 p-3"
                >
                  <p class="text-[11px] uppercase tracking-wide text-slate-500">{{ fact.label }}</p>
                  <p class="mt-1 text-sm font-semibold text-slate-100">
                    {{ fact.value }}
                  </p>
                </li>
              </ul>

              <p v-if="attackError" class="text-xs font-medium text-red-300">{{ attackError }}</p>

              <p
                  v-if="selectedOwnedTerritory && targetTerritory"
                  class="text-xs text-slate-400"
              >
                Ordre Twitch :
                <span class="font-mono text-primary">{{ attackCommandLabel || '!attaque &lt;pays&gt;' }}</span>
                <span class="ml-1 text-slate-500">
                  (défense {{ targetTerritory.defensePower ?? 0 }})
                </span>
              </p>
              <p v-if="selectedReinforcement" class="text-xs font-medium text-amber-300">
                Ce territoire participe déjà à un renfort.
              </p>

              <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                    variant="outline"
                    size="sm"
                    class="pointer-events-auto"
                    @click="cancelSelection"
                    :disabled="!selectedOwnedTerritory && !targetTerritory"
                >
                  <OctagonMinus class="size-4"/>
                  Réinitialiser
                </Button>
                <Button
                    variant="secondary"
                    size="lg"
                    class="pointer-events-auto"
                    :disabled="!attackCTAEnabled"
                    @click="launchAttack"
                >
                  <Swords class="size-5"/>
                  <span v-if="attackLoading">Préparation...</span>
                  <span v-else>Lancer l'attaque</span>
                </Button>
              </div>

              <p
                  v-if="!attackCTAEnabled && attackDisabledMessage"
                  class="text-xs font-medium text-amber-300"
              >
                {{ attackDisabledMessage }}
              </p>
            </div>
          </div>

          <div
              v-if="showReinforcementActions"
              class="space-y-4 border-t border-white/10 bg-slate-900/50 p-4"
          >
            <div v-if="currentReinforcementStats" class="space-y-3 text-sm text-slate-300">
              <p v-if="reinforcementError" class="text-xs font-medium text-red-300">{{ reinforcementError }}</p>
              <div
                  class="space-y-3 rounded-xl border border-sky-500/40 bg-slate-900/70 p-4 ring-1 ring-sky-500/20"
              >
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p class="text-xs uppercase tracking-wide text-slate-500">Renfort en cours</p>
                    <p class="text-lg font-semibold text-slate-100">
                      {{ reinforcementTargetName }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs uppercase tracking-wide text-slate-500">Temps restant</p>
                    <p class="text-2xl font-semibold text-sky-300">
                      {{ formatDuration(currentReinforcementStats.remaining) }}
                    </p>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <span>Messages
                    <span class="font-semibold text-slate-100">{{ currentReinforcementStats.messages }}</span>
                  </span>
                  <span>Participants
                    <span class="font-semibold text-slate-100">{{ currentReinforcementStats.participants }}</span>
                  </span>
                  <span>Défense actuelle
                    <span class="font-semibold text-slate-100">{{ currentReinforcementStats.accumulatedBonus }}</span>
                  </span>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3">
                  <p class="text-xs text-slate-400">
                    Votre chat peut spammer
                    <span class="font-mono text-primary">
                      {{ reinforcementCommandLabel || '!renfort <pays>' }}
                    </span>
                    pour booster la défense.
                  </p>
                  <Button
                      variant="outline"
                      size="sm"
                      class="pointer-events-auto"
                      :disabled="cancelReinforcementLoading"
                      @click="cancelCurrentReinforcement"
                  >
                    <OctagonX class="size-4"/>
                    <span v-if="cancelReinforcementLoading">Annulation...</span>
                    <span v-else>Annuler le renfort</span>
                  </Button>
                </div>
              </div>
            </div>

            <div v-else class="space-y-3 text-sm text-slate-300">
              <ul class="grid gap-3 sm:grid-cols-3">
                <li
                    v-for="fact in reinforcementFacts"
                    :key="fact.label"
                    class="rounded-lg border border-white/10 bg-slate-900/50 p-3"
                >
                  <p class="text-[11px] uppercase tracking-wide text-slate-500">{{ fact.label }}</p>
                  <p class="mt-1 text-sm font-semibold text-slate-100">
                    {{ fact.value }}
                  </p>
                </li>
              </ul>

              <p v-if="reinforcementError" class="text-xs font-medium text-red-300">{{ reinforcementError }}</p>

              <div>
                <p class="text-xs text-slate-400">
                  Ordre Twitch :
                  <span class="font-mono text-primary">
                    {{ reinforcementCommandLabel || '!renfort &lt;pays&gt;' }}
                  </span>
                </p>
                <p v-if="selectedReinforcement" class="text-xs font-medium text-amber-300">
                  Un renfort est déjà en cours sur ce territoire.
                </p>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                    variant="outline"
                    size="sm"
                    class="pointer-events-auto"
                    :disabled="!selectedOwnedTerritory"
                    @click="cancelSelection"
                >
                  <OctagonMinus class="size-4"/>
                  Réinitialiser
                </Button>
                <Button
                    variant="secondary"
                    size="lg"
                    class="pointer-events-auto"
                    :disabled="!reinforcementCTAEnabled"
                    @click="launchReinforcement"
                >
                  <Shield class="size-5"/>
                  <span v-if="reinforcementLoading">Préparation...</span>
                  <span v-else>Lancer un renfort</span>
                </Button>
              </div>

              <p
                  v-if="showReinforcementWarning"
                  class="text-xs font-medium text-amber-300"
              >
                {{ reinforcementDisabledMessage }}
              </p>

              <p class="text-xs text-slate-500">
                Activez un renfort pour augmenter durablement la défense du territoire sélectionné.
                Pendant {{ reinforcementWindowLabel }}, vos viewers doivent spammer
                <span class="font-mono">{{ reinforcementCommandLabel || '!renfort <pays>' }}</span>
                sur Twitch.
              </p>
            </div>
          </div>
        </div>

        <div v-else class="rounded-lg border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">
          <p v-if="attackError" class="text-xs font-medium text-red-300">{{ attackError }}</p>
          <p v-else-if="reinforcementError" class="text-xs font-medium text-red-300">{{ reinforcementError }}</p>
          <p v-else>Aucune action disponible pour ce territoire.</p>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
