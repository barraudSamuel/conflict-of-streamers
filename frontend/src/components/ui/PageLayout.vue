<script setup lang="ts">
/**
 * PageLayout Component
 * Design System: full-screen game layout with optional grid background
 * Features: header/main/footer slots, grid pattern background
 */

interface Props {
  showGrid?: boolean
  fullHeight?: boolean
}

withDefaults(defineProps<Props>(), {
  showGrid: false,
  fullHeight: true,
})
</script>

<template>
  <div
    :class="[
      'flex flex-col bg-game-dark',
      fullHeight ? 'min-h-screen' : '',
      showGrid ? 'bg-grid-pattern' : '',
    ]"
  >
    <!-- Header slot -->
    <header
      v-if="$slots.header"
      class="flex-shrink-0"
    >
      <slot name="header" />
    </header>

    <!-- Main content area -->
    <main class="flex-1 flex flex-col">
      <slot />
    </main>

    <!-- Footer slot -->
    <footer
      v-if="$slots.footer"
      class="flex-shrink-0"
    >
      <slot name="footer" />
    </footer>
  </div>
</template>
