import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import base44 from '@base44/vite-plugin'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// sourceLocationBabelPlugin — injects data-source-location for Flare Mode
// Loaded conditionally so a missing file never breaks production builds
let sourceLocationBabelPlugin = null
try {
  sourceLocationBabelPlugin = require('./build/sourceLocationBabelPlugin.cjs')
} catch (_) {
  // plugin not present — skip silently
}

export default defineConfig({
  plugins: [
    react({
      babel: sourceLocationBabelPlugin
        ? { plugins: [sourceLocationBabelPlugin] }
        : undefined,
    }),
    base44({
      legacySDKImports: false,
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})