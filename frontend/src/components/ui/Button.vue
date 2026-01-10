<script setup lang="ts">
/**
 * Button Component
 * Design System: agar.io-inspired neon aesthetic
 * Streaming-optimized: 18px+ text, high contrast, glow effects
 */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  fullWidth: false,
  type: 'button',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}

// Variant styles mapping
const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-player-cyan text-game-dark font-semibold
    hover:bg-[#33f7ff] hover:shadow-glow
    focus-visible:ring-2 focus-visible:ring-player-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-game-dark
    active:scale-[0.98]
  `,
  secondary: `
    bg-game-surface text-white border border-game-border
    hover:border-player-cyan hover:text-player-cyan hover:shadow-glow-sm
    focus-visible:ring-2 focus-visible:ring-player-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-game-dark
    active:scale-[0.98]
  `,
  danger: `
    bg-danger text-white font-semibold
    hover:bg-[#ff5555] hover:shadow-glow-red
    focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-game-dark
    active:scale-[0.98]
  `,
  ghost: `
    bg-transparent text-white
    hover:bg-game-surface hover:text-player-cyan
    focus-visible:ring-2 focus-visible:ring-player-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-game-dark
    active:scale-[0.98]
  `,
}

// Size styles mapping (18px minimum for streaming - FR53)
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-base min-h-[40px] rounded-lg',
  md: 'px-6 py-3 text-lg min-h-[48px] rounded-lg',
  lg: 'px-8 py-4 text-xl min-h-[56px] rounded-xl',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading"
    :aria-disabled="disabled || loading"
    :class="[
      // Base styles
      'inline-flex items-center justify-center gap-2',
      'font-medium transition-all duration-200 ease-out',
      'select-none cursor-pointer',
      // Variant styles
      variantClasses[variant],
      // Size styles
      sizeClasses[size],
      // Full width
      fullWidth ? 'w-full' : '',
      // Disabled state
      (disabled || loading) ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
    ]"
    @click="handleClick"
  >
    <!-- Loading spinner -->
    <svg
      v-if="loading"
      class="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>

    <!-- Button content -->
    <slot />
  </button>
</template>
