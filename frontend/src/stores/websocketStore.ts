import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// Simple logger with log levels
const logger = {
  info: (msg: string) => {
    if (import.meta.env.DEV) {
      console.log(`[WS] ${msg}`)
    }
  },
  warn: (msg: string) => {
    console.warn(`[WS] ${msg}`)
  },
  error: (msg: string, error?: unknown) => {
    console.error(`[WS] ${msg}`, error)
  }
}

export const useWebSocketStore = defineStore('websocket', () => {
  const ws = ref<WebSocket | null>(null)
  const url = ref<string>('')
  const connectionState = ref<number>(WebSocket.CLOSED)
  const isConnected = computed(() => connectionState.value === WebSocket.OPEN)
  const retryCount = ref<number>(0)
  const maxRetries = ref<number>(10)
  const reconnectTimeoutId = ref<number | null>(null)

  function connect(wsUrl: string) {
    url.value = wsUrl
    try {
      ws.value = new WebSocket(wsUrl)

      ws.value.onopen = () => {
        connectionState.value = WebSocket.OPEN
        retryCount.value = 0 // Reset retry count on successful connection
        logger.info('Connected')
      }

      ws.value.onerror = (error) => {
        logger.error('Connection error', error)
      }

      ws.value.onclose = () => {
        connectionState.value = WebSocket.CLOSED
        logger.info('Disconnected')

        // Auto-reconnect with exponential backoff
        if (url.value && retryCount.value < maxRetries.value) {
          retryCount.value++
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
          const delay = Math.min(1000 * Math.pow(2, retryCount.value - 1), 30000)
          logger.info(`Reconnecting in ${delay}ms (attempt ${retryCount.value}/${maxRetries.value})`)

          reconnectTimeoutId.value = window.setTimeout(() => {
            if (url.value) connect(url.value)
          }, delay)
        } else if (retryCount.value >= maxRetries.value) {
          logger.error('Max reconnection attempts reached, giving up')
        }
      }
    } catch (error) {
      logger.error('Connection failed', error)
      connectionState.value = WebSocket.CLOSED
    }
  }

  function send<T>(event: string, data: T): boolean {
    if (!ws.value || connectionState.value !== WebSocket.OPEN) {
      logger.warn('Cannot send, not connected')
      return false
    }
    try {
      ws.value.send(JSON.stringify({ event, data }))
      return true
    } catch (error) {
      logger.error('Send failed', error)
      return false
    }
  }

  function disconnect() {
    url.value = '' // Prevent auto-reconnect
    retryCount.value = 0

    // Clear any pending reconnect timeout
    if (reconnectTimeoutId.value !== null) {
      clearTimeout(reconnectTimeoutId.value)
      reconnectTimeoutId.value = null
    }

    ws.value?.close()
    ws.value = null
    connectionState.value = WebSocket.CLOSED
  }

  // Cleanup function for component unmount
  // Should be called in onBeforeUnmount() to prevent memory leaks
  function cleanup() {
    disconnect()
  }

  return { ws, isConnected, connectionState, retryCount, maxRetries, connect, send, disconnect, cleanup }
})
