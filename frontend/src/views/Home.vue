<script setup lang="ts">
import { ref } from 'vue'

const message = ref('Bienvenue sur Conflict of Streamers')
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-4">{{ message }}</h1>
      <p class="text-gray-400">Le jeu de conquête territoriale en temps réel</p>
    </div>
  </div>
</template>
