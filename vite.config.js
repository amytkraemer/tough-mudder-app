import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Deployed to GitHub Pages at https://amytkraemer.github.io/tough-mudder-app/
export default defineConfig({
  base: '/tough-mudder-app/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/apple-touch-icon.png',
        'fonts/*.woff2',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        navigateFallback: '/tough-mudder-app/index.html',
      },
      manifest: {
        name: 'Tough Mudder 5K Training',
        short_name: 'TM Training',
        description: '47-week Tough Mudder 5K training plan, tracker, exercise guide and grip log.',
        theme_color: '#0E1712',
        background_color: '#0E1712',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/tough-mudder-app/',
        scope: '/tough-mudder-app/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
