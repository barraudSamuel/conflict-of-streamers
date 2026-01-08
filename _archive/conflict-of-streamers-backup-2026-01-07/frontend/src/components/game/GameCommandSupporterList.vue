<script setup lang="ts">
import {computed} from 'vue'
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar'

interface SupporterLike {
  id?: string | number | null
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  messages?: number | null
}

const props = defineProps<{
  supporters: SupporterLike[]
  badgeClass?: string
  badgeTextClass?: string
}>()

const badgeClass = computed(() => props.badgeClass ?? 'bg-primary')
const badgeTextClass = computed(() => props.badgeTextClass ?? 'text-slate-900')

const getInitials = (supporter: SupporterLike) => {
  const source = supporter.displayName || supporter.username || '??'
  return source.slice(0, 2).toUpperCase()
}
</script>

<template>
  <div class="flex -space-x-2">
    <div
        v-for="(supporter, index) in supporters"
        :key="supporter.id || supporter.username || supporter.displayName || `supporter-${index}`"
        class="relative"
        :style="{ zIndex: supporters.length - index }"
    >
      <Avatar class="h-10 w-10 border border-white/10 ring-2 ring-slate-900/60">
        <AvatarImage
            v-if="supporter.avatarUrl"
            :src="supporter.avatarUrl"
            :alt="`Avatar de ${supporter.displayName || supporter.username || 'viewer'}`"
        />
        <AvatarFallback class="flex size-full items-center justify-center rounded-full bg-slate-700 text-xs font-semibold uppercase text-slate-200">
          {{ getInitials(supporter) }}
        </AvatarFallback>
      </Avatar>
      <span
          v-if="(supporter.messages ?? 0) > 1"
          class="absolute -bottom-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
          :class="[badgeClass, badgeTextClass]"
      >
        x{{ supporter.messages }}
      </span>
    </div>
  </div>
</template>
