<script setup lang="ts">
import {computed} from 'vue'
import GameCommandSupporterList from '@/components/game/GameCommandSupporterList.vue'

interface SupporterLike {
  id?: string | number | null
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  messages?: number | null
}

const props = withDefaults(
  defineProps<{
    title: string
    name: string
    subtitle: string
    supporters?: SupporterLike[]
    supporterBadgeClass?: string
    supporterBadgeTextClass?: string
    overflowCount?: number
    align?: 'left' | 'right'
    showSupporterRow?: boolean
  }>(),
  {
    supporters: () => [],
    supporterBadgeClass: 'bg-primary',
    supporterBadgeTextClass: 'text-slate-900',
    overflowCount: 0,
    align: 'left',
    showSupporterRow: true
  }
)

const headerClass = computed(() =>
  props.align === 'right' ? 'text-right space-y-1' : ''
)

const supportRowClass = computed(() =>
  props.align === 'right' ? 'justify-end' : ''
)
</script>

<template>
  <div class="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
    <div :class="headerClass">
      <p class="text-sm uppercase tracking-[0.3em] text-slate-400">{{ title }}</p>
      <p class="text-2xl font-semibold text-slate-100">
        {{ name }}
      </p>
      <p class="text-sm text-slate-400">
        {{ subtitle }}
      </p>
    </div>

    <div
        v-if="showSupporterRow"
        class="flex items-center gap-2"
        :class="supportRowClass"
    >
      <GameCommandSupporterList
          :supporters="supporters"
          :badge-class="supporterBadgeClass"
          :badge-text-class="supporterBadgeTextClass"
      />
      <span
          v-if="overflowCount > 0"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-xs font-semibold text-slate-200"
      >
        +{{ overflowCount }}
      </span>
    </div>

    <div class="space-y-3">
      <slot />
    </div>
  </div>
</template>
