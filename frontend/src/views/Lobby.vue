<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClipboard } from '@vueuse/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getGame, startGame as startGameRequest } from '@/services/api'
import {
  Gamepad2,
  Crown,
  Users,
  Settings,
  Copy,
  LogOut,
  ListTodo,
  Map
} from 'lucide-vue-next'

const PLAYER_SESSION_KEY = 'cos.player'

interface PlayerContext {
  playerId: string
  twitchUsername: string
  isAdmin: boolean
  gameId: string
  gameCode: string
}

const route = useRoute()
const router = useRouter()
const gameId = route.params.gameId as string

const game = ref<any>(null)
const loading = ref(true)
const error = ref('')
const startingGame = ref(false)
const startError = ref('')
const playerContext = ref<PlayerContext | null>(null)

const maxPlayers = computed(() => game.value?.settings?.maxPlayers ?? 8)
const playerCount = computed(() => game.value?.players?.length ?? 0)
const emptySlots = computed(() => Math.max(maxPlayers.value - playerCount.value, 0))
const territoriesByOwner = computed<Record<string, number>>(() => {
  if (!game.value?.territories) return {}
  return (game.value.territories as any[]).reduce((acc: Record<string, number>, territory: any) => {
    if (territory.ownerId) {
      acc[territory.ownerId] = (acc[territory.ownerId] ?? 0) + 1
    }
    return acc
  }, {})
})
const selectedCountriesCount = computed(() => {
  if (!game.value?.players) return 0
  return game.value.players.filter((player: any) => territoriesByOwner.value[player.id]).length
})

const minPlayersMet = computed(() => playerCount.value >= 2)
const countriesRequirementMet = computed(
  () => playerCount.value > 0 && selectedCountriesCount.value === playerCount.value
)
const meetsStartRequirements = computed(() => minPlayersMet.value && countriesRequirementMet.value)
const currentPlayerId = computed(() => playerContext.value?.playerId ?? '')
const isCurrentPlayerAdmin = computed(
  () => Boolean(game.value?.adminId) && currentPlayerId.value === game.value.adminId
)
const canStart = computed(
  () =>
    isCurrentPlayerAdmin.value && game.value?.status === 'lobby' && meetsStartRequirements.value
)

const source = computed(() => game.value?.code ?? '')
const { copy, copied } = useClipboard({ source })

const loadPlayerContext = (): PlayerContext | null => {
  try {
    const stored = sessionStorage.getItem(PLAYER_SESSION_KEY)
    return stored ? (JSON.parse(stored) as PlayerContext) : null
  } catch {
    return null
  }
}

const fetchGame = async () => {
  try {
    loading.value = true
    const response = await getGame(gameId)
    game.value = response.game
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Erreur lors du chargement de la partie'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  playerContext.value = loadPlayerContext()
  await fetchGame()
})

const leaveGame = () => {
  router.push('/')
}

const playerHasTerritory = (playerId: string) => Boolean(territoriesByOwner.value[playerId])

const handleStartGame = async () => {
  if (!game.value || !canStart.value || startingGame.value) return

  startError.value = ''
  startingGame.value = true

  try {
    const response = await startGameRequest(game.value.id, currentPlayerId.value)
    game.value = response.game
  } catch (err) {
    startError.value =
      err instanceof Error ? err.message : 'Impossible de démarrer la partie pour le moment.'
  } finally {
    startingGame.value = false
  }
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
      <Card>
        <CardContent>
          <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-2xl font-bold">
                <Gamepad2 class="w-8 h-8" />
                <span>Code: {{ game.code }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-300">
                <Crown class="w-4 h-4 text-yellow-500" />
                <span class="text-lg"
                  >Créée par
                  <span class="text-primary font-bold">{{
                    game.adminTwitchUsername || 'Admin'
                  }}</span></span
                >
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-300">
                <span class="inline-block w-4 h-4 bg-slate-600 rounded-sm"></span>
                <span>Statut: {{ game.status === 'playing' ? '⚔️ En cours' : '😴 En attente' }}</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
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

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Map class="size-6" />
                Choisissez votre pays de départ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="relative rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src="/world-map-placeholder.svg"
                  alt="Carte du monde"
                  class="w-full h-full rounded object-cover min-h-[400px]"
                />

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

              <div class="mt-4 flex items-start gap-2 bg-accent rounded-sm p-3 text-sm">
                <span>⚠️</span>
                <span class="text-muted-foreground"
                  >👉 Cliquez sur un pays disponible (en gris) pour le sélectionner</span
                >
              </div>
            </CardContent>
          </Card>

          <Card v-if="isCurrentPlayerAdmin">
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
                  <div class="space-y-2">
                    <label class="text-sm flex items-center gap-2"> ⚔️ Durée Attaque </label>
                    <Input
                      type="number"
                      :value="game.settings?.attackDuration || 30"
                      class="bg-slate-800 border-slate-700 text-white"
                      readonly
                    />
                  </div>

                  <div class="space-y-2">
                    <label class="text-sm flex items-center gap-2"> 🛡️ Durée Défense </label>
                    <Input
                      type="number"
                      :value="game.settings?.defenseDuration || 30"
                      class="bg-slate-800 border-slate-700 text-white"
                      readonly
                    />
                  </div>

                  <div class="space-y-2">
                    <label class="text-sm flex items-center gap-2"> 💪 Durée Renfort </label>
                    <Input
                      type="number"
                      :value="game.settings?.reinforcementDuration || 30"
                      class="bg-slate-800 border-slate-700 text-white"
                      readonly
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card v-else class="border-dashed border-slate-700 bg-slate-900/50">
            <CardHeader>
              <CardTitle class="text-sm uppercase tracking-wide text-muted-foreground">
                Paramètres verrouillés
              </CardTitle>
            </CardHeader>
            <CardContent class="text-sm text-muted-foreground">
              Seul le créateur de la partie peut consulter ou modifier les paramètres. Assurez-vous
              d'avoir sélectionné votre pays et attendez son signal pour démarrer.
            </CardContent>
          </Card>
        </div>

        <div class="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Users class="size-6" />
                Joueurs ({{ playerCount }}/{{ maxPlayers }})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-3">
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
                          <template v-if="playerHasTerritory(player.id)">
                            ✓ Pays sélectionné
                          </template>
                          <template v-else>⏳ Choix en cours...</template>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

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

          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <ListTodo class="size-6" />
                Statut de préparation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-sm">
                    <span class="flex items-center gap-2">
                      📍 Pays sélectionnés:
                    </span>
                    <span
                      class="font-semibold"
                      :class="countriesRequirementMet ? 'text-green-500' : 'text-destructive'"
                    >
                      {{ selectedCountriesCount }}/{{ playerCount }}
                    </span>
                  </div>
                </div>

                <Button
                  v-if="isCurrentPlayerAdmin"
                  @click="handleStartGame"
                  class="w-full"
                  size="lg"
                  :disabled="!canStart || startingGame"
                >
                  <template v-if="startingGame">🚀 Démarrage...</template>
                  <template v-else>🚀 DÉMARRER LA CONQUÊTE !</template>
                </Button>

                <div v-else class="text-sm text-muted-foreground text-center">
                  En attente du créateur pour le lancement.
                </div>

                <div class="space-y-2 text-sm text-muted-foreground">
                  <div v-if="playerCount < 2" class="flex items-start gap-2">
                    <span>⚠️</span>
                    <span>au moins 2 joueurs requis</span>
                  </div>
                  <div v-if="selectedCountriesCount < playerCount" class="flex items-start gap-2">
                    <span>⚠️</span>
                    <span>Tous les joueurs doivent choisir un pays</span>
                  </div>
                  <div v-if="startError" class="flex items-start gap-2 text-destructive">
                    <span>⚠️</span>
                    <span>{{ startError }}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
