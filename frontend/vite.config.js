import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached separately (rarely changes)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI & animation utilities
          'vendor-ui': ['react-hot-toast', 'react-icons'],
          // PDF generation (heavy — only needed on order details)
          'vendor-pdf': ['jspdf'],
        },
      },
    },
  },
})
