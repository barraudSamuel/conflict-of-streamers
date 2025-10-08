import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/lobby/:gameId',
      name: 'lobby',
      component: () => import('../views/Lobby.vue')
    },
    {
      path: '/game/:gameId',
      name: 'game',
      component: () => import('../views/Game.vue')
    }
  ]
})

export default router
