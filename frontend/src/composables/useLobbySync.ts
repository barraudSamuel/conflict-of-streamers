/**
 * useLobbySync - Composable for real-time lobby synchronization via WebSocket
 * Handles lobby:join, lobby:sync, lobby:playerJoined, lobby:playerLeft events
 *
 * Fixed issues:
 * - HIGH-1: Race condition - now uses watch to wait for WebSocket creation
 * - MEDIUM-2: Re-sends lobby:join on reconnection
 */

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useWebSocketStore } from '@/stores/websocketStore'
import type { LobbySyncEvent, LobbyPlayerJoinedEvent, LobbyPlayerLeftEvent, WebSocketErrorEvent } from 'shared/types'
import { LOBBY_EVENTS } from 'shared/types'

const WS_URL = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/ws`

export function useLobbySync(roomCode: string, playerId: string) {
  const router = useRouter()
  const lobbyStore = useLobbyStore()
  const wsStore = useWebSocketStore()

  const connectionError = ref<string | null>(null)
  const isJoined = ref(false)
  const messageHandlerAttached = ref(false)

  function handleMessage(event: MessageEvent) {
    try {
      const { event: eventName, data } = JSON.parse(event.data)

      switch (eventName) {
        case LOBBY_EVENTS.SYNC: {
          const syncData = data as LobbySyncEvent
          lobbyStore.syncPlayers(syncData.players)
          isJoined.value = true
          break
        }

        case LOBBY_EVENTS.PLAYER_JOINED: {
          const player = data as LobbyPlayerJoinedEvent
          lobbyStore.addPlayer(player)
          break
        }

        case LOBBY_EVENTS.PLAYER_LEFT: {
          const leftData = data as LobbyPlayerLeftEvent
          lobbyStore.removePlayer(leftData.playerId)
          break
        }

        case LOBBY_EVENTS.ERROR: {
          const errorData = data as WebSocketErrorEvent
          connectionError.value = errorData.message

          // Redirect on critical errors
          if (errorData.code === 'INVALID_JOIN' || errorData.code === 'ROOM_NOT_FOUND') {
            router.push({ name: 'home', query: { error: errorData.code } })
          }
          break
        }
      }
    } catch (error) {
      // Silent catch - invalid JSON from server
    }
  }

  function sendJoinEvent() {
    // Guard: Don't send if playerId is empty (HIGH-2 fix)
    if (!playerId || !roomCode) {
      connectionError.value = 'Missing roomCode or playerId'
      return
    }
    wsStore.send(LOBBY_EVENTS.JOIN, { roomCode, playerId })
  }

  function sendLeaveEvent() {
    if (wsStore.isConnected) {
      wsStore.send(LOBBY_EVENTS.LEAVE, {})
    }
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

  // Watch for connection status changes to handle reconnection (MEDIUM-2 fix)
  const stopWatchingStatus = watch(
    () => wsStore.connectionStatus,
    (newStatus, oldStatus) => {
      // On successful connection (including reconnection)
      if (newStatus === 'connected' && oldStatus !== 'connected') {
        const ws = wsStore.ws
        if (ws) {
          attachMessageHandler(ws)
          sendJoinEvent()
        }
      }
    }
  )

  // Watch for WebSocket instance changes (HIGH-1 fix)
  const stopWatchingWs = watch(
    () => wsStore.ws,
    (newWs, oldWs) => {
      // Detach from old socket
      if (oldWs && oldWs !== newWs) {
        detachMessageHandler(oldWs)
      }

      // Attach to new socket if already open
      if (newWs && newWs.readyState === WebSocket.OPEN) {
        attachMessageHandler(newWs)
        sendJoinEvent()
      }
    }
  )

  onMounted(() => {
    // Start WebSocket connection
    wsStore.connect(WS_URL)

    // If WebSocket already exists and is open (unlikely but possible)
    const ws = wsStore.ws
    if (ws && ws.readyState === WebSocket.OPEN) {
      attachMessageHandler(ws)
      sendJoinEvent()
    }
  })

  onBeforeUnmount(() => {
    // Stop watchers
    stopWatchingStatus()
    stopWatchingWs()

    // Send leave event before disconnecting
    sendLeaveEvent()

    // Remove message handler
    detachMessageHandler(wsStore.ws)

    // Disconnect WebSocket
    wsStore.disconnect()

    // Clear lobby state
    lobbyStore.exitLobby()
  })

  return {
    isConnected: computed(() => wsStore.isConnected),
    connectionStatus: computed(() => wsStore.connectionStatus),
    retryCount: computed(() => wsStore.retryCount),
    isJoined,
    connectionError
  }
}
