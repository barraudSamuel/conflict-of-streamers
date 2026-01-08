const HTTP_API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')
const httpProtocol = HTTP_API_URL.startsWith('https') ? 'https' : 'http'
const wsProtocol = httpProtocol === 'https' ? 'wss' : 'ws'
const urlWithoutProtocol = HTTP_API_URL.replace(/^https?:\/\//i, '')
const DEFAULT_WS_URL = `${wsProtocol}://${urlWithoutProtocol}/ws`

const WS_URL = import.meta.env.VITE_WS_URL || DEFAULT_WS_URL

export type SocketMessage = {
  type: string
  [key: string]: any
}

export interface GameSocketOptions {
  onOpen?: () => void
  onMessage?: (message: SocketMessage) => void
  onError?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
}

export const createGameSocket = (options: GameSocketOptions = {}): WebSocket | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const socket = new WebSocket(WS_URL)

  if (options.onOpen) {
    socket.addEventListener('open', options.onOpen)
  }

  if (options.onMessage) {
    socket.addEventListener('message', (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data)
        options.onMessage?.(payload)
      } catch (error) {
        console.error('Failed to parse websocket message', error)
      }
    })
  }

  if (options.onError) {
    socket.addEventListener('error', options.onError)
  }

  if (options.onClose) {
    socket.addEventListener('close', options.onClose)
  }

  return socket
}

export const sendSocketMessage = (
  socket: WebSocket | null,
  type: string,
  payload: Record<string, unknown> = {}
) => {
  if (!socket) return

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, payload }))
    return
  }

  if (socket.readyState === WebSocket.CONNECTING) {
    const handleOpen = () => {
      socket.removeEventListener('open', handleOpen)
      socket.send(JSON.stringify({ type, payload }))
    }
    socket.addEventListener('open', handleOpen)
  }
}

export const isSocketOpen = (socket: WebSocket | null) => socket?.readyState === WebSocket.OPEN
