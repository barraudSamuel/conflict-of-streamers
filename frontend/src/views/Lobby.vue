<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClipboard } from '@vueuse/core'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getGame } from '@/services/api'
import { Gamepad2, Crown, Users, Settings, Copy, LogOut, Twitch, Map } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const gameId = route.params.gameId as string
const game = ref<any>(null)
const loading = ref(true)
const error = ref('')

// Mock data for players (will be replaced with real data from WebSocket)
const maxPlayers = 8
const emptySlots = computed(() => {
  if (!game.value) return maxPlayers
  return maxPlayers - (game.value.players?.length || 0)
})

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

const source = computed(() => game.value?.code || '')
const { copy, copied, isSupported } = useClipboard({ source })

const connectTwitch = () => {
  // TODO: Implement Twitch connection
  console.log('Connect to Twitch')
}

const leaveGame = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen container mx-auto px-4 py-8 md:py-12">
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <p class="text-lg text-slate-400">Chargement...</p>
    </div>

    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <p class="text-lg text-red-400 mb-4">{{ error }}</p>
        <Button @click="router.push('/')" variant="secondary">Retour à l'accueil</Button>
      </div>
    </div>

    <div v-else-if="game" class="max-w-[1600px] mx-auto space-y-6">
      <!-- Header Section -->
      <Card>
        <CardContent>
          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-2xl font-bold">
                <Gamepad2 class="w-8 h-8" />
                <span>Code: {{ game.code }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-300">
                <Crown class="w-4 h-4 text-yellow-500" />
                <span class="text-lg">Créée par <span class="text-primary font-bold">{{ game.adminTwitchUsername || 'Admin' }}</span></span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-300">
                <span class="inline-block w-4 h-4 bg-slate-600 rounded-sm"></span>
                <span>Statut: 😴 En attente</span>
              </div>
            </div>

            <div class="flex gap-3">
              <Button @click="connectTwitch">
                <Twitch /> CONNECTER TWITCH
              </Button>
              <Button variant="outline" @click="copy(source)">
                <Copy class="w-4 h-4 mr-2" />
                <span v-if="!copied">COPIER CODE</span>
                <span v-else>CODE COPIÉ !</span>
              </Button>
              <Button @click="leaveGame" variant="destructive">
                <LogOut class="w-4 h-4 mr-2" />
                Quitter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Map Section -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Map Card -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Map class="size-6" /> Choisissez votre pays de départ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <!-- Map Placeholder -->
              <div class="relative rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src="/world-map-placeholder.svg"
                  alt="Carte du monde"
                  class="w-full h-full rounded object-cover min-h-[400px]"
                />

                <!-- Legend -->
                <div class="absolute bottom-4 left-4 bg-card text-card-foreground rounded-xl p-4 space-y-2">
                  <div class="font-semibold mb-2">Légende</div>
                  <div class="flex items-center gap-2 text-sm">
                    <div class="w-4 h-4 bg-slate-400 rounded-sm"></div>
                    <span>Pays disponibles</span>
                  </div>
                  <div class="flex items-center gap-2 text-sm">
                    <div class="w-4 h-4 bg-destructive rounded-sm"></div>
                    <span>Pays pris</span>
                  </div>
                  <div class="flex items-center gap-2 text-sm">
                    <div class="w-4 h-4 bg-slate-700 rounded-sm"></div>
                    <span>Non sélectionnable</span>
                  </div>
                </div>
              </div>

              <!-- Warning Message -->
              <div class="mt-4 flex items-start gap-2 bg-accent rounded-sm p-3 text-sm">
                <span>⚠️</span>
                <span class="text-muted-foreground">👉 Cliquez sur un pays disponible (en gris) pour le sélectionner</span>
              </div>
            </CardContent>
          </Card>

          <!-- Settings Section -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Settings class="size-6" />
                Paramètres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div class="text-base font-medium mb-3">Durées des Actions (secondes)</div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Attack Duration -->
                  <div class="space-y-2">
                    <label class="text-sm flex items-center gap-2">
                      ⚔️ Durée Attaque
                    </label>
                    <Input
                      type="number"
                      :value="game.settings?.attackDuration || 30"
                      class="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <!-- Defense Duration -->
                  <div class="space-y-2">
                    <label class="text-sm flex items-center gap-2">
                      🛡️ Durée Défense
                    </label>
                    <Input
                      type="number"
                      :value="game.settings?.defenseDuration || 30"
                      class="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <!-- Reinforcement Duration -->
                  <div class="space-y-2">
                    <label class="text-sm flex items-center gap-2">
                      💪 Durée Renfort
                    </label>
                    <Input
                      type="number"
                      :value="game.settings?.reinforcementDuration || 30"
                      class="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Players Sidebar -->
        <div class="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Users class="size-6" />
                Joueurs ({{ game.players?.length || 1 }}/{{ maxPlayers }})
              </CardTitle>
            </CardHeader>
            <CardContent>

              <div class="space-y-3">
                <!-- Players Loop -->
                <template v-for="player in game.players" :key="player.id">
                  <div class="bg-accent rounded-lg p-2 border-2">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                        :style="{ backgroundColor: player.color }"
                      >
                        {{ (player.twitchUsername || 'P')[0].toUpperCase() }}
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="font-semibold">{{ player.twitchUsername }}</span>
                          <Crown v-if="player.isAdmin" class="w-4 h-4 text-yellow-500" />
                        </div>
                        <div class="text-sm text-muted-foreground flex items-center gap-1">
                          <template v-if="player.territories && player.territories.length > 0">
                            ✓ Pays sélectionné
                          </template>
                          <template v-else>
                            ⏳ Choix en cours...
                          </template>
                        </div>
                      </div>
                      <div class="text-destructive text-sm flex items-center gap-1">
                        <Twitch class="w-4 h-4" />
                        Twitch
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Empty Slots -->
                <template v-for="_i in emptySlots" :key="`empty-${_i}`">
                  <div class="bg-accent bg-opacity-50 rounded-lg p-2 border-2 border-dashed">
                    <div class="flex items-center gap-3">
                      <div class="size-10 bg-muted-foreground rounded-full flex items-center justify-center">
                        <Users class="size-5" />
                      </div>
                      <div class="flex-1">
                        <div class="flex text-sm text-muted-foreground items-center gap-2">
                          ⏳ En attente d'un joueur...
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
