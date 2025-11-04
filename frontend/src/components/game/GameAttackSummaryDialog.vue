<script setup lang="ts">
import { computed } from 'vue'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue'
import DialogFooter from '@/components/ui/dialog/DialogFooter.vue'
import DialogClose from '@/components/ui/dialog/DialogClose.vue'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Flame, MessageSquare, Shield, Swords, Timer } from 'lucide-vue-next'
import type { AttackParticipantSummary, AttackSummaryStats } from '@/types/game'

const props = defineProps<{
  open: boolean
  stats: AttackSummaryStats | null
  getPlayerUsername?: (playerId?: string | null) => string | null
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'close'): void
}>()

const attack = computed(() => props.stats?.attack ?? null)

const attackerLabel = computed(() => {
  const playerId = attack.value?.attackerId ?? null
  if (typeof props.getPlayerUsername === 'function') {
    return props.getPlayerUsername(playerId) ?? 'Attaquant'
  }
  return 'Attaquant'
})

const defenderLabel = computed(() => {
  const playerId = attack.value?.defenderId ?? null
  if (typeof props.getPlayerUsername === 'function') {
    return props.getPlayerUsername(playerId) ?? 'Défenseur'
  }
  return 'Défenseur'
})

const territoryLabel = computed(() => attack.value?.toTerritoryName ?? attack.value?.toTerritory ?? 'territoire ciblé')
const originLabel = computed(() => attack.value?.fromTerritoryName ?? attack.value?.fromTerritory ?? 'territoire source')

const durationSeconds = computed(() => {
  if (!attack.value) return null
  const start = Number(attack.value.startTime)
  const end = Number(attack.value.endTime)
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null
  }
  const diff = Math.max(0, Math.round((end - start) / 1000))
  return diff
})

const bestSpammer = computed(() => {
  if (!props.stats) return null
  const combined: AttackParticipantSummary[] = [
    ...(props.stats.topAttackers ?? []),
    ...(props.stats.topDefenders ?? [])
  ]
  if (combined.length === 0) return null
  return combined.reduce((best, current) => {
    if (!best) return current
    if (current.messages > best.messages) return current
    if (current.messages === best.messages) {
      const bestName = (best.displayName ?? best.username ?? '').toLowerCase()
      const currentName = (current.displayName ?? current.username ?? '').toLowerCase()
      return currentName.localeCompare(bestName) < 0 ? current : best
    }
    return best
  }, combined[0]!)
})

const bestSpammerSide = computed<'attack' | 'defense' | null>(() => {
  if (!bestSpammer.value) return null
  if (props.stats?.topAttackers?.some((entry) => entry === bestSpammer.value)) {
    return 'attack'
  }
  if (props.stats?.topDefenders?.some((entry) => entry === bestSpammer.value)) {
    return 'defense'
  }
  return null
})

const winnerMessage = computed(() => {
  if (!attack.value) return ''
  if (attack.value.winner === attack.value.attackerId) {
    return `${attackerLabel.value} conquiert ${territoryLabel.value}!`
  }
  if (attack.value.winner === attack.value.defenderId) {
    return `${defenderLabel.value} repousse l'attaque sur ${territoryLabel.value}.`
  }
  return `Combat indécis sur ${territoryLabel.value}.`
})

const formatViewerName = (entry: AttackParticipantSummary | null) => {
  if (!entry) return 'Viewer'
  return entry.displayName || entry.username || entry.id || 'Viewer'
}

const viewerInitials = (entry: AttackParticipantSummary | null) => {
  const label = formatViewerName(entry)
  return label.slice(0, 2).toUpperCase()
}

const close = () => {
  emit('update:open', false)
  emit('close')
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
        :overlay-class="'bg-slate-950/80 backdrop-blur'"
        class="w-full !max-w-4xl space-y-6 border border-white/10 bg-slate-950/90 p-6 sm:max-h-[85vh] sm:overflow-y-auto sm:p-10"
    >
      <DialogHeader class="space-y-3 text-left">
        <DialogTitle class="flex flex-col gap-2 text-left text-2xl text-slate-100 sm:flex-row sm:items-center sm:gap-4 sm:text-3xl">
          <span class="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-400">
            <Swords class="size-4 text-emerald-300" />
            Rapport de bataille
          </span>
          <span class="text-base font-semibold text-slate-200 sm:ml-auto sm:text-lg">
            {{ originLabel }} → {{ territoryLabel }}
          </span>
        </DialogTitle>
        <DialogDescription class="text-left text-slate-300">
          {{ winnerMessage }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 md:grid-cols-4">
        <div class="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">Attaque</p>
          <p class="mt-2 text-2xl font-semibold text-emerald-200">
            {{ stats?.attackPoints ?? 0 }}
          </p>
          <p class="mt-1 text-xs text-emerald-100/80">
            {{ stats?.attackerMessages ?? 0 }} messages · {{ stats?.attackerParticipants ?? 0 }} soldats
          </p>
        </div>
        <div class="rounded-xl border border-sky-400/40 bg-sky-400/10 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-sky-200/80">Défense</p>
          <p class="mt-2 text-2xl font-semibold text-sky-200">
            {{ stats?.defensePoints ?? 0 }}
          </p>
          <p class="mt-1 text-xs text-sky-100/80">
            {{ stats?.defenderMessages ?? 0 }} messages · {{ stats?.defenderParticipants ?? 0 }} défenseurs
          </p>
        </div>
        <div class="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-200/80">
            <MessageSquare class="size-4" />
            Meilleur spammeur
          </p>
          <p class="mt-2 text-lg font-semibold text-amber-100">
            {{ formatViewerName(bestSpammer) }}
          </p>
          <p class="mt-1 text-xs text-amber-100/80">
            {{ bestSpammer?.messages ?? 0 }} messages ·
            <span
                v-if="bestSpammerSide === 'attack'"
                class="text-emerald-200"
            >
              Camp attaque
            </span>
            <span
                v-else-if="bestSpammerSide === 'defense'"
                class="text-sky-200"
            >
              Camp défense
            </span>
            <span v-else class="text-slate-200">Camp inconnu</span>
          </p>
        </div>
        <div class="rounded-xl border border-slate-400/30 bg-slate-800/70 p-4">
          <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300/80">
            <Timer class="size-4" />
            Durée
          </p>
          <p class="mt-2 text-lg font-semibold text-slate-100">
            <template v-if="durationSeconds !== null">
              {{ durationSeconds }} s
            </template>
            <template v-else>
              N/A
            </template>
          </p>
          <p class="mt-1 text-xs text-slate-400">
            {{ attackerLabel }} vs {{ defenderLabel }}
          </p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <section class="space-y-4 rounded-2xl border border-emerald-400/20 bg-slate-900/70 p-5">
          <header class="flex items-center justify-between">
            <h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-200/80">
              <Flame class="size-4" />
              Top attaquants
            </h3>
            <span class="text-xs text-emerald-100/70">
              {{ stats?.attackerMessages ?? 0 }} messages cumulés
            </span>
          </header>
          <ul class="space-y-3">
            <li
                v-for="(supporter, index) in stats?.topAttackers ?? []"
                :key="`attack-${supporter.id ?? supporter.displayName ?? index}`"
                class="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-3"
            >
              <div class="flex items-center gap-3">
                <span class="text-xs font-semibold text-slate-500">#{{ index + 1 }}</span>
                <Avatar class="size-10 border border-emerald-400/30">
                  <AvatarImage
                      v-if="supporter.avatarUrl"
                      :src="supporter.avatarUrl"
                      :alt="`Avatar de ${formatViewerName(supporter)}`"
                  />
                  <AvatarFallback class="bg-emerald-500/20 text-sm font-semibold text-emerald-200">
                    {{ viewerInitials(supporter) }}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p class="text-sm font-semibold text-slate-100">
                    {{ formatViewerName(supporter) }}
                  </p>
                  <p class="text-xs text-emerald-100/80">
                    {{ supporter.messages }} messages
                  </p>
                </div>
              </div>
            </li>
            <li v-if="!stats || (stats.topAttackers ?? []).length === 0" class="rounded-xl border border-dashed border-emerald-400/20 bg-slate-950/50 p-4 text-center text-xs text-slate-400">
              Aucun spam détecté côté attaque.
            </li>
          </ul>
        </section>

        <section class="space-y-4 rounded-2xl border border-sky-400/20 bg-slate-900/70 p-5">
          <header class="flex items-center justify-between">
            <h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-sky-200/80">
              <Shield class="size-4" />
              Top défenseurs
            </h3>
            <span class="text-xs text-sky-100/70">
              {{ stats?.defenderMessages ?? 0 }} messages cumulés
            </span>
          </header>
          <ul class="space-y-3">
            <li
                v-for="(supporter, index) in stats?.topDefenders ?? []"
                :key="`defense-${supporter.id ?? supporter.displayName ?? index}`"
                class="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-3"
            >
              <div class="flex items-center gap-3">
                <span class="text-xs font-semibold text-slate-500">#{{ index + 1 }}</span>
                <Avatar class="size-10 border border-sky-400/30">
                  <AvatarImage
                      v-if="supporter.avatarUrl"
                      :src="supporter.avatarUrl"
                      :alt="`Avatar de ${formatViewerName(supporter)}`"
                  />
                  <AvatarFallback class="bg-sky-500/20 text-sm font-semibold text-sky-200">
                    {{ viewerInitials(supporter) }}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p class="text-sm font-semibold text-slate-100">
                    {{ formatViewerName(supporter) }}
                  </p>
                  <p class="text-xs text-sky-100/80">
                    {{ supporter.messages }} messages
                  </p>
                </div>
              </div>
            </li>
            <li v-if="!stats || (stats.topDefenders ?? []).length === 0" class="rounded-xl border border-dashed border-sky-400/20 bg-slate-950/50 p-4 text-center text-xs text-slate-400">
              Aucun spam détecté côté défense.
            </li>
          </ul>
        </section>
      </div>

      <DialogFooter class="sm:justify-end">
        <DialogClose as-child>
          <Button variant="secondary" class="w-full sm:w-auto" @click="close">
            Fermer
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
