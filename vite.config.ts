/// <reference types="vitest" />
import {defineConfig} from 'vite'

export default defineConfig({
  base: '/vbs/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          data: ['./src/data/star-trek-data.js'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    open: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
