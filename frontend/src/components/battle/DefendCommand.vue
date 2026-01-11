<script setup lang="ts">
/**
 * DefendCommand Component (Story 4.3)
 * Displays the defend command with copy-to-clipboard functionality
 * Styled for streaming visibility (large text)
 */
import { ref } from 'vue'

interface Props {
  command: string
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  command: '',
  label: 'Dites a vos viewers de spammer:'
})

// Copy success state
const copySuccess = ref(false)
const copyError = ref(false)

/**
 * Copy command to clipboard with fallback for older browsers
 */
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(props.command)
    copySuccess.value = true
    copyError.value = false
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea')
      textarea.value = props.command
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      copySuccess.value = true
      setTimeout(() => {
        copySuccess.value = false
      }, 2000)
    } catch {
      copyError.value = true
      setTimeout(() => {
        copyError.value = false
      }, 2000)
    }
  }
}
</script>

<template>
  <div class="defend-command">
    <!-- Label -->
    <p class="text-gray-300 text-sm mb-2 flex items-center gap-2">
      <span class="text-lg">📢</span>
      {{ label }}
    </p>

    <!-- Command box -->
    <div class="command-box flex items-center justify-between gap-4 p-4 rounded-lg bg-gray-900/80 border border-gray-700">
      <!-- Command text (large for streaming visibility) -->
      <code class="command-text text-2xl font-bold text-white tracking-wider select-all">
        {{ command }}
      </code>

      <!-- Copy button -->
      <button
        type="button"
        class="copy-button flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200"
        :class="{
          'bg-success text-black': copySuccess,
          'bg-danger text-white': copyError,
          'bg-gray-700 hover:bg-gray-600 text-white': !copySuccess && !copyError
        }"
        @click="copyToClipboard"
      >
        <!-- Icon -->
        <span v-if="copySuccess" class="text-lg">✓</span>
        <span v-else-if="copyError" class="text-lg">✕</span>
        <span v-else class="text-lg">📋</span>

        <!-- Text -->
        <span v-if="copySuccess">Copie!</span>
        <span v-else-if="copyError">Erreur</span>
        <span v-else>Copier</span>
      </button>
    </div>

    <!-- Visual hint for streaming -->
    <p class="text-xs text-gray-500 mt-2 text-center">
      Cliquez sur la commande pour la selectionner
    </p>
  </div>
</template>

<style scoped>
.command-box {
  background: linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(10, 10, 10, 0.95) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.command-text {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.copy-button {
  min-width: 120px;
}

/* Success button glow */
.copy-button.bg-success {
  box-shadow: 0 0 20px rgba(0, 255, 127, 0.4);
}

/* Error button glow */
.copy-button.bg-danger {
  box-shadow: 0 0 20px rgba(255, 59, 59, 0.4);
}
</style>
