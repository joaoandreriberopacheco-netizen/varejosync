import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import base44 from '@base44/vite-plugin'
import path from 'path'
import { fileURLToPath } from 'url'
import { FLARE_AND_INSPECTION_UI_ENABLED } from './src/config/devToolsFlags.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    base44({
      legacySDKImports: false,
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: FLARE_AND_INSPECTION_UI_ENABLED,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      sonner: path.resolve(__dirname, './src/lib/sonner-shim.js'),
      'sonner-original': path.resolve(__dirname, 'node_modules/sonner'),
    },
  },
})
