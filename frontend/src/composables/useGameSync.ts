/**
 * useGameSync - Composable for real-time game synchronization via WebSocket
 * Story 4.1 - Handles game:stateInit and territory:update events
 *
 * Manages game phase WebSocket communication:
 * - Receives initial game state with territories
 * - Handles territory ownership updates in real-time
 */

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useWebSocketStore } from '@/stores/websocketStore'
import { useTerritoryStore } from '@/stores/territoryStore'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useBattleStore } from '@/stores/battleStore'
import type {
  GameStateInitEvent,
  TerritoryUpdateEvent,
  WebSocketErrorEvent,
  BattleStartEvent,
  BattleEndEvent,
  AttackFailedEvent,
  BattleProgressEvent
} from 'shared/types'
import { GAME_EVENTS, LOBBY_EVENTS, BATTLE_EVENTS } from 'shared/types'

const WS_URL = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/ws`

export function useGameSync(roomCode: string, playerId: string) {
  const wsStore = useWebSocketStore()
  const territoryStore = useTerritoryStore()
  const lobbyStore = useLobbyStore()
  const battleStore = useBattleStore()

  const connectionError = ref<string | null>(null)
  const isInitialized = ref(false)
  const messageHandlerAttached = ref(false)

  /**
   * Handle incoming WebSocket messages for game phase
   */
  function handleMessage(event: MessageEvent) {
    try {
      const { event: eventName, data } = JSON.parse(event.data)

      switch (eventName) {
        // Initial game state with map (Story 4.1)
        case GAME_EVENTS.STATE_INIT: {
          const stateData = data as GameStateInitEvent
          // Set territories from server state
          territoryStore.setTerritories(stateData.territories)
          // Sync config if present
          if (stateData.config) {
            lobbyStore.syncConfig(stateData.config)
          }
          isInitialized.value = true
          break
        }

        // Territory ownership change (Story 4.1)
        case GAME_EVENTS.TERRITORY_UPDATE: {
          const updateData = data as TerritoryUpdateEvent
          territoryStore.updateTerritoryOwner(updateData)
          break
        }

        // Story 4.2: Battle started
        case BATTLE_EVENTS.START: {
          const battleData = data as BattleStartEvent
          battleStore.handleBattleStart(battleData)
          // Update territory battle flags
          territoryStore.setTerritoryBattleStatus(battleData.attackerTerritoryId, { isAttacking: true })
          territoryStore.setTerritoryBattleStatus(battleData.defenderTerritoryId, { isUnderAttack: true })
          break
        }

        // Story 4.2: Attack failed
        case BATTLE_EVENTS.ATTACK_FAILED: {
          const failedData = data as AttackFailedEvent
          battleStore.handleAttackFailed(failedData)
          break
        }

        // Story 4.4: Battle progress update (real-time force values)
        case BATTLE_EVENTS.PROGRESS: {
          const progressData = data as BattleProgressEvent
          battleStore.handleBattleProgress(progressData)
          break
        }

        // Story 4.2: Battle ended (cleanup active battle state)
        // Story 4.3: Clear territory battle flags for defender
        // Story 4.7: Territory transfer is handled via game:territoryUpdate event
        // Story 4.8: Display battle summary with top 5 spammers (FR30-FR33)
        case BATTLE_EVENTS.END: {
          const endData = data as BattleEndEvent
          // Get battle info before clearing to know which territories to update
          const battle = battleStore.activeBattles.get(endData.battleId)
          if (battle) {
            // Clear battle flags from both territories
            territoryStore.setTerritoryBattleStatus(battle.attackerTerritoryId, {
              isAttacking: false
            })
            territoryStore.setTerritoryBattleStatus(battle.defenderTerritoryId, {
              isUnderAttack: false
            })
          }
          // Story 4.7: Territory transfer is handled via game:territoryUpdate event
          // Story 4.8: Handle with summary display
          battleStore.handleBattleEndWithSummary(endData)
          break
        }

        // Error handling
        case LOBBY_EVENTS.ERROR: {
          const errorData = data as WebSocketErrorEvent
          connectionError.value = errorData.message
          break
        }
      }
    } catch (error) {
      // Silent catch - invalid JSON from server
    }
  }

  /**
   * Request initial game state from server
   */
  function requestGameState() {
    if (!playerId || !roomCode) {
      connectionError.value = 'Missing roomCode or playerId'
      return
    }
    // Re-join to request current game state
    wsStore.send(LOBBY_EVENTS.JOIN, { roomCode, playerId })
  }

  function attachMessageHandler(ws: WebSocket) {
    if (messageHandlerAttached.value) return
    ws.addEventListener('message', handleMessage)
    messageHandlerAttached.value = true
  }

  function detachMessageHandler(ws: WebSocket | null) {
    if (!ws || !messageHandlerAttached.value) return
    ws.removeEventListener('message', handleMessage)
    messageHandlerAttached.value = false
  }

  // Watch for connection status changes to handle reconnection
  const stopWatchingStatus = watch(
    () => wsStore.connectionStatus,
    (newStatus, oldStatus) => {
      if (newStatus === 'connected' && oldStatus !== 'connected') {
        const ws = wsStore.ws
        if (ws) {
          attachMessageHandler(ws)
          requestGameState()
        }
      }
    }
  )

  // Watch for WebSocket instance changes
  const stopWatchingWs = watch(
    () => wsStore.ws,
    (newWs, oldWs) => {
      if (oldWs && oldWs !== newWs) {
        detachMessageHandler(oldWs)
      }

      if (newWs && newWs.readyState === WebSocket.OPEN) {
        attachMessageHandler(newWs)
        requestGameState()
      }
    }
  )

  onMounted(() => {
    // If not already connected, start WebSocket connection
    if (!wsStore.isConnected) {
      wsStore.connect(WS_URL)
    }

    // If WebSocket already exists and is open
    const ws = wsStore.ws
    if (ws && ws.readyState === WebSocket.OPEN) {
      attachMessageHandler(ws)
      requestGameState()
    }
  })

  onBeforeUnmount(() => {
    // Stop watchers
    stopWatchingStatus()
    stopWatchingWs()

    // Remove message handler
    detachMessageHandler(wsStore.ws)

    // Note: Don't disconnect WebSocket here if user might return to lobby
    // The WebSocket cleanup should be handled based on application state
  })

  return {
    isConnected: computed(() => wsStore.isConnected),
    connectionStatus: computed(() => wsStore.connectionStatus),
    retryCount: computed(() => wsStore.retryCount),
    isInitialized,
    connectionError
  }
}
