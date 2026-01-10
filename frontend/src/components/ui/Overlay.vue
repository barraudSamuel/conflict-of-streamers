<script setup lang="ts">
/**
 * Overlay Component
 * Design System: modal backdrop with glass morphism effect
 * Features: click outside to close, escape key support
 */
import { watch, onUnmounted } from 'vue'

interface Props {
  visible?: boolean
  closeOnClick?: boolean
  closeOnEscape?: boolean
  blur?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  closeOnClick: true,
  closeOnEscape: true,
  blur: true,
})

const emit = defineEmits<{
  close: []
}>()

function handleBackdropClick() {
  if (props.closeOnClick) {
    emit('close')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.closeOnEscape && props.visible) {
    emit('close')
  }
}

// Only listen for escape key when overlay is visible
watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeydown)
    } else {
      document.removeEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-50"
      >
        <!-- Backdrop -->
        <div
          :class="[
            'absolute inset-0 bg-black/80',
            blur ? 'backdrop-blur-sm' : '',
          ]"
          @click="handleBackdropClick"
        />

        <!-- Content container -->
        <div class="relative z-10 flex items-center justify-center min-h-full p-4">
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-4"
          >
            <div
              v-if="visible"
              @click.stop
            >
              <slot />
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
