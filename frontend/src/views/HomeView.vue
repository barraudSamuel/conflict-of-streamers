<script setup lang="ts">
/**
 * HomeView - Page d'accueil avec tutoriel
 * Story 1.4 - FR52 Tutoriel textuel, FR53 Interface streaming
 */
import { RouterLink } from 'vue-router'
import { Button, Card, Container, PageLayout } from '@/components/ui'
</script>

<template>
  <PageLayout :show-grid="true">
    <Container size="lg" class="py-12 flex flex-col items-center justify-center min-h-screen">
      <!-- Application Title -->
      <h1 class="text-4xl md:text-5xl font-bold text-player-cyan text-glow text-center mb-8 animate-fade-in">
        CONFLICT OF STREAMERS
      </h1>

      <p class="text-lg text-gray-300 text-center mb-10 animate-fade-in animation-delay-100">
        Le jeu de conquête territoriale en temps réel pour streamers
      </p>

      <!-- Tutorial Card -->
      <Card :padding="'lg'" :glow="true" class="w-full max-w-3xl mb-10 animate-slide-up animation-delay-200">
        <template #header>
          <h2 class="text-2xl font-bold text-white">Comment jouer ?</h2>
        </template>

        <div class="space-y-8">
          <!-- Créer une partie -->
          <section>
            <h3 class="text-xl font-semibold text-player-cyan mb-3">Créer une partie</h3>
            <ol class="list-decimal list-inside space-y-2 text-base text-gray-200">
              <li>Cliquez sur "Créer une Partie"</li>
              <li>Entrez votre pseudo Twitch</li>
              <li>Configurez les paramètres (durée batailles, cooldown)</li>
              <li>Partagez le code de partie avec vos amis streamers</li>
            </ol>
          </section>

          <!-- Rejoindre une partie -->
          <section>
            <h3 class="text-xl font-semibold text-player-cyan mb-3">Rejoindre une partie</h3>
            <ol class="list-decimal list-inside space-y-2 text-base text-gray-200">
              <li>Cliquez sur "Rejoindre une Partie"</li>
              <li>Entrez le code de partie reçu</li>
              <li>Entrez votre pseudo Twitch</li>
              <li>Sélectionnez votre territoire de départ</li>
            </ol>
          </section>

          <!-- Règles du jeu -->
          <section>
            <h3 class="text-xl font-semibold text-player-cyan mb-3">Règles du jeu</h3>
            <ul class="list-disc list-inside space-y-2 text-base text-gray-200">
              <li>Chaque streamer possède des territoires sur la carte</li>
              <li>Attaquez les territoires adjacents pour les conquérir</li>
              <li>Vos viewers spamment dans le chat pour vous aider</li>
              <li>Le dernier streamer avec des territoires gagne !</li>
            </ul>
          </section>

          <!-- Commandes Twitch -->
          <section>
            <h3 class="text-xl font-semibold text-player-cyan mb-3">Commandes Twitch</h3>
            <p class="text-base text-gray-200 mb-3">Vos viewers tapent dans le chat :</p>
            <div class="bg-game-dark rounded-lg p-4 space-y-2">
              <div class="flex items-center gap-3">
                <code class="px-3 py-1 bg-player-red/20 text-player-red rounded font-mono text-base">ATTACK [nom]</code>
                <span class="text-gray-300">Pour attaquer un territoire</span>
              </div>
              <div class="flex items-center gap-3">
                <code class="px-3 py-1 bg-player-green/20 text-player-green rounded font-mono text-base">DEFEND [nom]</code>
                <span class="text-gray-300">Pour défendre un territoire</span>
              </div>
            </div>
          </section>
        </div>
      </Card>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md animate-slide-up animation-delay-300">
        <RouterLink to="/create" class="flex-1" aria-label="Créer une nouvelle partie">
          <Button variant="primary" size="lg" :full-width="true">
            Créer une Partie
          </Button>
        </RouterLink>
        <RouterLink to="/join" class="flex-1" aria-label="Rejoindre une partie existante">
          <Button variant="secondary" size="lg" :full-width="true">
            Rejoindre une Partie
          </Button>
        </RouterLink>
      </div>
    </Container>
  </PageLayout>
</template>
