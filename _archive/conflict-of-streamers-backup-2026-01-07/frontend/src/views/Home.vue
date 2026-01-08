<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Users, Zap, Crown, KeyRound, Sword, Swords, MessageCircle } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createGame, joinGame } from '@/services/api'
import { savePlayerContext } from '@/lib/playerStorage'

const router = useRouter()
const twitchUsername = ref('')
const isCreating = ref(false)
const error = ref('')

const joinTwitchUsername = ref('')
const joinCode = ref('')
const isJoining = ref(false)
const joinError = ref('')

async function handleCreateGame() {
  if (!twitchUsername.value.trim()) {
    error.value = 'Veuillez entrer votre pseudo Twitch'
    return
  }

  try {
    isCreating.value = true
    error.value = ''
    const adminId = crypto.randomUUID()
    const response = await createGame(twitchUsername.value.trim(), adminId)

    if (response.success && response.game.id) {
      savePlayerContext({
        playerId: adminId,
        twitchUsername: twitchUsername.value.trim(),
        isAdmin: true,
        gameId: response.game.id,
        gameCode: response.game.code
      })

      await router.push(`/lobby/${response.game.id}`)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors de la création de la partie'
  } finally {
    isCreating.value = false
  }
}

async function handleJoinGame() {
  if (!joinTwitchUsername.value.trim() || !joinCode.value.trim()) {
    joinError.value = 'Pseudo Twitch et code de session requis'
    return
  }

  try {
    isJoining.value = true
    joinError.value = ''
    const playerId = crypto.randomUUID()
    const response = await joinGame(joinCode.value.trim().toUpperCase(), playerId, joinTwitchUsername.value.trim())

    if (response.success && response.game.id) {
      savePlayerContext({
        playerId,
        twitchUsername: joinTwitchUsername.value.trim(),
        isAdmin: false,
        gameId: response.game.id,
        gameCode: response.game.code
      })

      await router.push(`/lobby/${response.game.id}`)
    }
  } catch (err) {
    joinError.value = err instanceof Error ? err.message : 'Impossible de rejoindre la partie'
  } finally {
    isJoining.value = false
  }
}

const features = [
  {
    icon: Users,
    title: 'Chat Power',
    description: 'Votre chat Twitch devient votre force de frappe ! Plus de spam = plus de puissance.'
  },
  {
    icon: Zap,
    title: 'Temps Réel',
    description: 'Actions instantanées avec cooldowns stratégiques ! Attaquez, défendez, renforcez.'
  },
  {
    icon: Crown,
    title: 'Conquête',
    description: 'Dominez la carte du monde ! Dernier streamer debout remporte la victoire.'
  }
]

const tutorial = [
  {
    icon: KeyRound,
    title: '1. Connexion',
    description: 'Connectez votre chat Twitch à la partie'
  },
  {
    icon: Sword,
    title: '2. Actions',
    description: 'Lancez des attaques, défenses ou renforts'
  },
  {
    icon: MessageCircle,
    title: '3. Spam',
    description: 'Votre chat spam les commandes pour la puissance'
  }
]
</script>

<template>
  <div class="container mx-auto flex flex-col justify-center items-center min-h-screen py-8 md:py-12 lg:py-18 px-4">
    <div class="flex flex-col items-center text-center mb-12 md:mb-16 lg:mb-20">
      <div class="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
        <Swords class="size-12 sm:size-14 md:size-16" />
        <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary">Conflict of Streamers</h1>
      </div>
      <p class="mt-4 text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl px-4">Conquérez le monde avec votre chat Twitch ! Un jeu de stratégie où
        vos viewers deviennent votre armée de conquérants.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mb-12 md:mb-16">
      <Card v-for="feature in features" :key="feature.title" class="flex flex-col items-center text-center">
        <CardHeader class="w-full flex flex-col items-center">
          <component :is="feature.icon" class="size-8"/>
          <CardTitle class="text-xl">{{ feature.title }}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription class="text-base">{{ feature.description }}</CardDescription>
        </CardContent>
      </Card>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-6xl mb-12 md:mb-16">
      <Card class="w-full">
        <CardHeader class="flex flex-col items-start">
          <CardTitle>Créer une nouvelle partie</CardTitle>
          <CardDescription>Commencez une nouvelle partie et invitez d'autres streamers à vous rejoindre.</CardDescription>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="handleCreateGame">
            <div class="grid items-center w-full gap-4">
              <div class="flex flex-col space-y-2">
                <Label for="create-username">Pseudo Twitch</Label>
                <Input
                  id="create-username"
                  v-model="twitchUsername"
                  placeholder="Potatoz"
                  :disabled="isCreating"
                />
              </div>
              <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            class="w-full"
            @click="handleCreateGame"
            :disabled="isCreating"
          >
            {{ isCreating ? 'Création...' : 'Créer' }}
          </Button>
        </CardFooter>
      </Card>
      <Card class="w-full">
        <CardHeader class="flex flex-col items-start">
          <CardTitle>Rejoindre une partie</CardTitle>
          <CardDescription>Rejoignez une partie</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div class="grid items-center w-full gap-4">
              <div class="flex flex-col space-y-2">
                <Label for="join-username">Pseudo Twitch</Label>
                <Input
                  id="join-username"
                  v-model="joinTwitchUsername"
                  placeholder="Potatoz"
                  :disabled="isJoining"
                />
              </div>
              <div class="flex flex-col space-y-2">
                <Label for="join-code">Code session</Label>
                <Input
                  id="join-code"
                  type="password"
                  v-model="joinCode"
                  placeholder="ABC123"
                  class="uppercase"
                  :disabled="isJoining"
                />
              </div>
              <p v-if="joinError" class="text-sm text-destructive">{{ joinError }}</p>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button class="w-full" :disabled="isJoining" @click="handleJoinGame">
            {{ isJoining ? 'Connexion...' : 'Rejoindre' }}
          </Button>
        </CardFooter>
      </Card>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
      <Card v-for="feature in tutorial" :key="feature.title" class="flex flex-col items-center text-center">
        <CardHeader class="w-full flex flex-col items-center">
          <component :is="feature.icon" class="size-8"/>
          <CardTitle class="text-xl">{{ feature.title }}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription class="text-base">{{ feature.description }}</CardDescription>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
</style>
