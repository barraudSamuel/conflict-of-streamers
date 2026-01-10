<script setup lang="ts">
/**
 * Input Component
 * Design System: agar.io-inspired dark theme input
 * Features: validation states, icon support, 18px+ text for streaming
 */
import { computed, useId } from 'vue'

export type InputSize = 'sm' | 'md' | 'lg'

interface Props {
  modelValue?: string
  type?: 'text' | 'password' | 'email' | 'number' | 'search'
  placeholder?: string
  size?: InputSize
  disabled?: boolean
  error?: boolean
  errorMessage?: string
  success?: boolean
  label?: string
  hint?: string
  maxLength?: number
  id?: string
}

// Auto-generate unique ID for label/input association
const generatedId = useId()

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  size: 'md',
  disabled: false,
  error: false,
  errorMessage: '',
  success: false,
  label: '',
  hint: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function handleFocus(event: FocusEvent) {
  emit('focus', event)
}

function handleBlur(event: FocusEvent) {
  emit('blur', event)
}

// Computed input ID for label association
const inputId = computed(() => props.id || generatedId)

// Size styles mapping (18px minimum for streaming - FR53)
const sizeClasses: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-base min-h-[40px]',
  md: 'px-4 py-3 text-lg min-h-[48px]',
  lg: 'px-5 py-4 text-xl min-h-[56px]',
}

// Computed classes for input state
const inputClasses = computed(() => {
  const baseClasses = [
    'w-full rounded-lg',
    'bg-[#0d0d0d] text-white placeholder-gray-500',
    'border transition-all duration-200 ease-out',
    'focus:outline-none',
    sizeClasses[props.size],
  ]

  if (props.disabled) {
    baseClasses.push('opacity-50 cursor-not-allowed bg-game-surface')
  }

  if (props.error) {
    baseClasses.push('border-danger focus:border-danger focus:shadow-glow-red')
  } else if (props.success) {
    baseClasses.push('border-success focus:border-success focus:shadow-glow-green')
  } else {
    baseClasses.push('border-game-border focus:border-player-cyan focus:shadow-glow-sm')
  }

  return baseClasses.join(' ')
})
</script>

<template>
  <div class="w-full">
    <!-- Label -->
    <label
      v-if="label"
      :for="inputId"
      class="block text-base font-medium text-white mb-2"
    >
      {{ label }}
    </label>

    <!-- Input wrapper for icon support -->
    <div class="relative">
      <!-- Left icon slot -->
      <div
        v-if="$slots.icon"
        class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
      >
        <slot name="icon" />
      </div>

      <!-- Input element -->
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxLength"
        :class="[
          inputClasses,
          $slots.icon ? 'pl-12' : '',
        ]"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      >

      <!-- Right slot (for icons, character count, etc.) -->
      <div
        v-if="$slots.right"
        class="absolute right-4 top-1/2 -translate-y-1/2"
      >
        <slot name="right" />
      </div>
    </div>

    <!-- Hint text -->
    <p
      v-if="hint && !error"
      class="mt-2 text-sm text-gray-400"
    >
      {{ hint }}
    </p>

    <!-- Error message -->
    <p
      v-if="error && errorMessage"
      class="mt-2 text-base text-danger"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>
