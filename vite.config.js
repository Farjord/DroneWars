import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default defineConfig({
  plugins: [react()],
  base: '/DroneWars/',
  build: {
    rollupOptions: {
      plugins: [
        nodeResolve({
          browser: true,
          preferBuiltins: false
        })
      ]
    }
  }
})