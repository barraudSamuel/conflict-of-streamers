<script setup lang="ts">
withDefaults(
  defineProps<{
    countdown: string
    encouragement: string
    encouragementClass?: string
  }>(),
  {
    encouragementClass: 'text-primary/80'
  }
)
</script>

<template>
  <div class="flex w-full max-w-[22rem] flex-col items-center justify-center gap-6 px-4 text-center">
    <div class="text-7xl font-semibold tracking-tight text-slate-100 drop-shadow-lg">
      {{ countdown }}
    </div>
    <p class="text-3xl font-semibold text-pretty" :class="encouragementClass">
      {{ encouragement }}
    </p>
  </div>
</template>
