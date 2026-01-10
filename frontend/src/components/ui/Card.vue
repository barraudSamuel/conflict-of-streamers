<script setup lang="ts">
/**
 * Card Component
 * Design System: agar.io-inspired semi-transparent overlay
 * Features: header/content/footer slots, glow effect option, glass morphism
 */

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface Props {
  padding?: CardPadding
  glow?: boolean
  glass?: boolean
  hoverable?: boolean
}

withDefaults(defineProps<Props>(), {
  padding: 'md',
  glow: false,
  glass: false,
  hoverable: false,
})

// Padding styles mapping
const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}
</script>

<template>
  <div
    :class="[
      // Base styles
      'rounded-xl border border-game-border',
      'transition-all duration-200 ease-out',
      // Background
      glass
        ? 'bg-game-surface/80 backdrop-blur-md'
        : 'bg-game-surface',
      // Glow effect
      glow ? 'shadow-glow border-player-cyan/30' : '',
      // Hoverable
      hoverable ? 'hover:border-game-border-light hover:shadow-lg cursor-pointer' : '',
    ]"
  >
    <!-- Header slot -->
    <div
      v-if="$slots.header"
      :class="[
        'border-b border-game-border',
        padding === 'none' ? '' : paddingClasses[padding],
      ]"
    >
      <slot name="header" />
    </div>

    <!-- Default content slot -->
    <div :class="paddingClasses[padding]">
      <slot />
    </div>

    <!-- Footer slot -->
    <div
      v-if="$slots.footer"
      :class="[
        'border-t border-game-border',
        padding === 'none' ? '' : paddingClasses[padding],
      ]"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
