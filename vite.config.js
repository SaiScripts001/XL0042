import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The React app lives in /client, the Express API runs on :3001 and is proxied at /api.
export default defineConfig({
  root: 'client',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
