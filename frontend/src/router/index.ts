/**
 * Vue Router Configuration
 * Story 1.4 - AR12 Vue Router 4 en mode history
 * Story 2.1 - Added lobby route with validation guard
 * Story 2.2 - Enhanced lobby guard for joiners
 * Story 2.7 - Added game route for active game view
 */
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { api } from '@/services/api'
import { useLobbyStore } from '@/stores/lobbyStore'

/**
 * Lazy load wrapper with error handling
 * Redirects to home on chunk load failure
 */
function lazyLoad(importFn: () => Promise<unknown>) {
  return () => importFn().catch(() => {
    // On chunk load failure, redirect to home
    return import('@/views/HomeView.vue')
  })
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/create',
    name: 'create',
    component: lazyLoad(() => import('@/views/CreateGameView.vue'))
  },
  {
    path: '/join',
    name: 'join',
    component: lazyLoad(() => import('@/views/JoinGameView.vue'))
  },
  {
    path: '/lobby/:roomCode',
    name: 'lobby',
    component: lazyLoad(() => import('@/views/LobbyView.vue')),
    beforeEnter: async (to) => {
      const roomCode = to.params.roomCode as string
      const lobbyStore = useLobbyStore()

      // Check if user has lobby data (came via create or join form)
      if (lobbyStore.isInLobby && lobbyStore.roomCode === roomCode) {
        // User has valid lobby data, allow access
        return true
      }

      // User doesn't have lobby data, check if room exists
      try {
        const exists = await api.checkRoomExists(roomCode)
        if (!exists) {
          return { name: 'home', query: { error: 'room-not-found' } }
        }
        // Room exists but user hasn't joined - redirect to join form with code prefilled
        return { name: 'join', query: { code: roomCode } }
      } catch {
        return { name: 'home', query: { error: 'connection-error' } }
      }
    }
  },
  {
    path: '/game/:roomCode',
    name: 'game',
    component: lazyLoad(() => import('@/views/GameView.vue')),
    beforeEnter: (to) => {
      const roomCode = to.params.roomCode as string
      const lobbyStore = useLobbyStore()

      // Only allow access if user was in the lobby for this room
      // (navigation happens via game:started event, not direct URL)
      if (lobbyStore.isInLobby && lobbyStore.roomCode.toLowerCase() === roomCode.toLowerCase()) {
        return true
      }

      // Direct URL access - redirect to home
      return { name: 'home', query: { error: 'game-not-joined' } }
    }
  },
  {
    // Catch-all 404 route - redirect to home
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
