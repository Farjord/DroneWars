import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: '/DroneWars/',
  resolve: {
    alias: {
      'trystero/firebase': path.resolve(__dirname, 'node_modules/trystero/src/firebase.js')
    }
  },
  optimizeDeps: {
    exclude: ['firebase']
  }
})