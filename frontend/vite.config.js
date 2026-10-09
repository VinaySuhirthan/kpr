import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/level1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/v1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/level2': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/api/level3': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/level4': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
