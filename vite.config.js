import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/DroneWars/',
  optimizeDeps: {
    include: ['trystero/firebase', 'firebase']
  }
})