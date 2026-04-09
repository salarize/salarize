import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('xlsx')) return 'vendor-xlsx'
          if (id.includes('recharts')) return 'vendor-recharts'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('react-window')) return 'vendor-react-window'
          return
        },
      },
    },
  },
})
