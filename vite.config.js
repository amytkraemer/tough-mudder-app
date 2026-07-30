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
        // Keep the Firebase chunks (the only assets/index.esm-*.js files,
        // ~760KB incl. the 611KB Firestore chunk) OUT of the precache. They are
        // only needed after Google sign-in, so we fetch them lazily and cache
        // at runtime instead of shipping them to every first load.
        globIgnores: ['**/assets/index.esm-*.js'],
        navigateFallback: '/tough-mudder-app/index.html',
        runtimeCaching: [
          {
            urlPattern: /\/assets\/index\.esm-.*\.js$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'firebase-lazy', expiration: { maxEntries: 20 } },
          },
        ],
      },
      manifest: {
        name: 'Tough Mudder 5K Training',
        short_name: 'TM Training',
        description: '47-week Tough Mudder 5K training plan, tracker, exercise guide and grip log.',
        theme_color: '#0A0A0B',
        background_color: '#0A0A0B',
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
