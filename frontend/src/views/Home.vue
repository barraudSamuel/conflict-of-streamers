<script setup lang="ts">
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card'
import {Users, Zap, Crown, KeyRound, Sword, Swords, MessageCircle} from 'lucide-vue-next'
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"

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
          <form>
            <div class="grid items-center w-full gap-4">
              <div class="flex flex-col space-y-2">
                <Label for="name">Pseudo Twitch</Label>
                <Input id="name" placeholder="Potatoz"/>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button class="w-full">Créer</Button>
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
                <Label for="name">Pseudo Twitch</Label>
                <Input id="name" placeholder="Potatoz"/>
              </div>
              <div class="flex flex-col space-y-2">
                <Label for="name">Code session</Label>
                <Input id="name" placeholder="1234"/>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button class="w-full">Rejoindre</Button>
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
