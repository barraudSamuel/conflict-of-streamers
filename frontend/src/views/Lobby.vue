<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'

const router = useRouter()
const gameCode = ref('')
const twitchUsername = ref('')
const showCreateForm = ref(false)
const showJoinForm = ref(false)

const goHome = () => {
  router.push('/')
}

const showCreate = () => {
  showCreateForm.value = true
  showJoinForm.value = false
}

const showJoin = () => {
  showJoinForm.value = true
  showCreateForm.value = false
}

const createGame = () => {
  // TODO: Implement game creation with WebSocket
  console.log('Creating game for:', twitchUsername.value)
}

const joinGame = () => {
  // TODO: Implement joining game with WebSocket
  console.log('Joining game with code:', gameCode.value, 'as:', twitchUsername.value)
}
</script>

<template>
  <div class="lobby-container">
    <div class="lobby-content">
      <div class="header">
        <Button @click="goHome" variant="ghost" size="sm">
          ← Back to Home
        </Button>
        <h1 class="title">Game Lobby</h1>
      </div>

      <div v-if="!showCreateForm && !showJoinForm" class="lobby-actions">
        <div class="action-card">
          <h2>Create a New Game</h2>
          <p>Start a new game and invite other streamers to join</p>
          <Button @click="showCreate" size="lg" class="action-button">
            Create Game
          </Button>
        </div>

        <div class="action-card">
          <h2>Join a Game</h2>
          <p>Enter a 6-character code to join an existing game</p>
          <Button @click="showJoin" variant="outline" size="lg" class="action-button">
            Join Game
          </Button>
        </div>
      </div>

      <div v-if="showCreateForm" class="form-container">
        <h2>Create New Game</h2>
        <div class="form">
          <div class="form-group">
            <label for="create-username">Twitch Username</label>
            <input
              id="create-username"
              v-model="twitchUsername"
              type="text"
              placeholder="Enter your Twitch username"
              class="input"
            />
          </div>
          <div class="form-actions">
            <Button @click="createGame" size="lg">
              Create
            </Button>
            <Button @click="showCreateForm = false" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <div v-if="showJoinForm" class="form-container">
        <h2>Join Game</h2>
        <div class="form">
          <div class="form-group">
            <label for="join-code">Game Code</label>
            <input
              id="join-code"
              v-model="gameCode"
              type="text"
              placeholder="Enter 6-character code"
              maxlength="6"
              class="input"
            />
          </div>
          <div class="form-group">
            <label for="join-username">Twitch Username</label>
            <input
              id="join-username"
              v-model="twitchUsername"
              type="text"
              placeholder="Enter your Twitch username"
              class="input"
            />
          </div>
          <div class="form-actions">
            <Button @click="joinGame" size="lg">
              Join
            </Button>
            <Button @click="showJoinForm = false" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby-container {
  min-height: 100vh;
  padding: 2rem;
}

.lobby-content {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  margin-bottom: 2rem;
}

.title {
  font-size: 2.5rem;
  font-weight: bold;
  margin-top: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.lobby-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.action-card {
  padding: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.action-card h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.action-card p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.action-button {
  width: 100%;
}

.form-container {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.form-container h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #374151;
}

.input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.form-actions button:first-child {
  flex: 1;
}

@media (max-width: 640px) {
  .lobby-actions {
    grid-template-columns: 1fr;
  }

  .title {
    font-size: 2rem;
  }
}
</style>
