<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getGame } from '@/services/api'
import {Button} from "@/components/ui/button";

const route = useRoute()
const gameId = route.params.gameId as string
const game = ref<any>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    loading.value = true
    const response = await getGame(gameId)
    game.value = response.game
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement de la partie'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container mx-auto flex flex-col items-center min-h-screen py-8 px-4">
    <h1 class="text-4xl font-bold text-primary mb-8">Lobby</h1>

    <div v-if="loading" class="text-center">
      <p class="text-lg text-muted-foreground">Chargement...</p>
    </div>

    <div v-else-if="error" class="text-center">
      <p class="text-lg text-destructive">{{ error }}</p>
      <RouterLink to="/">
        <Button variant="secondary" class="mt-2">Retour à l'accueil</Button>
      </RouterLink>
    </div>

    <div v-else-if="game" class="w-full max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Partie créée !</CardTitle>
          <CardDescription>Code de la partie: <span class="font-bold text-lg">{{ game.code }}</span></CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div>
              <p class="text-sm text-muted-foreground">ID de la partie</p>
              <p class="font-mono text-sm">{{ game.id }}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Statut</p>
              <p class="font-semibold">{{ game.status }}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Joueurs</p>
              <p>{{ game.players?.length || 0 }} joueur(s)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>

</style>
