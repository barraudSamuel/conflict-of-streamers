<script setup lang="ts">
/**
 * MessageFeed Component (Story 4.5)
 * Displays real-time Twitch chat commands during battles
 * Shows viewer pseudo with visual validation (FR26-FR27)
 * FIFO display: max 10 messages, newest at bottom
 */
import { ref, watch, nextTick } from 'vue'
import type { FeedMessage } from 'shared/types'

interface Props {
  messages: FeedMessage[]
}

const props = defineProps<Props>()

const feedContainer = ref<HTMLElement | null>(null)

// Auto-scroll to newest message when messages array changes
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    if (feedContainer.value) {
      feedContainer.value.scrollTop = feedContainer.value.scrollHeight
    }
  }
)
</script>

<template>
  <div class="message-feed-container">
    <!-- Header -->
    <div class="feed-header mb-2 px-2">
      <span class="text-xs text-gray-400 uppercase tracking-wider">Chat en direct</span>
    </div>

    <!-- Messages container with auto-scroll -->
    <div
      ref="feedContainer"
      class="message-feed overflow-y-auto max-h-48 space-y-1.5 px-1"
    >
      <TransitionGroup name="feed">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-item px-3 py-2 rounded-lg text-base flex items-center gap-2 valid-message"
          :class="[
            msg.side === 'attacker'
              ? 'bg-red-500/20 border-l-3 border-red-500'
              : 'bg-blue-500/20 border-l-3 border-blue-500'
          ]"
        >
          <!-- Command type badge -->
          <span
            class="text-xs font-bold uppercase px-2 py-1 rounded"
            :class="[
              msg.commandType === 'ATTACK'
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 text-white'
            ]"
          >
            {{ msg.commandType === 'ATTACK' ? 'ATK' : 'DEF' }}
          </span>

          <!-- Username display - 18px+ for streaming visibility -->
          <span
            class="font-semibold truncate flex-1 text-lg"
            :class="[
              msg.side === 'attacker' ? 'text-red-200' : 'text-blue-200'
            ]"
          >
            {{ msg.displayName }}
          </span>

          <!-- Valid command indicator (green checkmark) - FR27 -->
          <span
            class="text-green-400 text-lg flex-shrink-0"
            title="Commande valide"
          >✓</span>
        </div>
      </TransitionGroup>

      <!-- Empty state -->
      <div
        v-if="messages.length === 0"
        class="text-center text-gray-500 text-xs py-4"
      >
        En attente des commandes Twitch...
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-feed-container {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  border-radius: 0.5rem;
  padding: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* FR27: Green background indicator for valid messages */
.valid-message {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.15) 0%, transparent 30%);
  box-shadow: inset 3px 0 0 0 rgba(34, 197, 94, 0.6);
}

/* 3px left border for side indicator */
.border-l-3 {
  border-left-width: 3px;
}

.message-feed {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.message-feed::-webkit-scrollbar {
  width: 4px;
}

.message-feed::-webkit-scrollbar-track {
  background: transparent;
}

.message-feed::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

/* Entry animation - slide from right + fade in (60 FPS) */
.feed-enter-active {
  transition: all 0.2s ease-out;
}

.feed-leave-active {
  transition: all 0.15s ease-in;
}

.feed-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.feed-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* Move animation for remaining items when one leaves */
.feed-move {
  transition: transform 0.2s ease-out;
}
</style>
