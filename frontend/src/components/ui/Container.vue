<script setup lang="ts">
/**
 * Container Component
 * Design System: centered max-width container for content
 */

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface Props {
  size?: ContainerSize
  centered?: boolean
  padding?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 'lg',
  centered: true,
  padding: true,
})

// Size styles mapping
const sizeClasses: Record<ContainerSize, string> = {
  sm: 'max-w-xl',     // 576px
  md: 'max-w-2xl',    // 672px
  lg: 'max-w-4xl',    // 896px
  xl: 'max-w-6xl',    // 1152px
  full: 'max-w-full', // No max width
}
</script>

<template>
  <div
    :class="[
      'w-full',
      sizeClasses[size],
      centered ? 'mx-auto' : '',
      padding ? 'px-4 sm:px-6 lg:px-8' : '',
    ]"
  >
    <slot />
  </div>
</template>
