import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      devOptions: { enabled: true },
      includeAssets: ['logo.png'],
      manifest: {
        name: 'Pass-Guard Secure Vault',
        short_name: 'Pass-Guard',
        description: 'Encrypted password vault with secure cloud sync.',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#030712',
        background_color: '#030712',
        display: 'standalone',
        start_url: '/Pass-Guard/',
        scope: '/Pass-Guard/',
        icons: [
          { src: '/Pass-Guard/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/Pass-Guard/logo.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  base: '/Pass-Guard/',
  build: {
    sourcemap: false,
    minify: 'esbuild',
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
})