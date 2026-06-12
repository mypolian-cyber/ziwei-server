import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '자미두수 예언소',
        short_name: '자미두수',
        description: '당신의 운명을 별자리로 읽다',
        theme_color: '#1a0a2e',
        background_color: '#1a0a2e',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: { proxy: { '/api': 'http://localhost:8003' } },
})
