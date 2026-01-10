/**
 * useGameView Composable
 * Placeholder - To be implemented in Epic 4 (Game Session Flow)
 * This file was reset during Story 1.3 as it contained legacy code
 * referencing non-existent modules.
 */

import { ref, computed } from 'vue'

export function useGameView() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const hasError = computed(() => error.value !== null)

  return {
    isLoading,
    error,
    hasError,
  }
}
