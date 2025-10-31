import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import Particles from '@tsparticles/vue3'
import { loadSlim } from '@tsparticles/slim'
import { loadEmittersPlugin } from '@tsparticles/plugin-emitters'

const app = createApp(App)

app.use(router)

app.use(Particles, {
  init: async (engine) => {
    await loadSlim(engine)
    await loadEmittersPlugin(engine)
  }
})

app.mount('#app')
