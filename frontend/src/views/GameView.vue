<script setup lang="ts">
/**
 * GameView - Main game screen (placeholder for Story 2.7)
 * Full game implementation will be in Epic 4 and 5
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Container, PageLayout, Card } from '@/components/ui'

const route = useRoute()
const roomCode = computed(() => (route.params.roomCode as string).toUpperCase())
</script>

<template>
  <PageLayout :show-grid="true">
    <Container size="lg" class="py-8 min-h-screen">
      <Card :padding="'lg'" :glow="true" class="text-center">
        <h1 class="text-3xl font-bold text-white mb-4">Partie en cours</h1>
        <p class="text-xl text-player-cyan mb-6">Code: {{ roomCode }}</p>
        <p class="text-gray-400">
          L'interface de jeu complete sera implementee dans l'Epic 4 et 5
        </p>
      </Card>
    </Container>
  </PageLayout>
</template>
