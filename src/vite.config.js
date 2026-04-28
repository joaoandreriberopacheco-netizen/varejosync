import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import base44 from '@base44/vite-plugin'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// sourceLocationBabelPlugin — injects data-source-location for Flare Mode
// Loaded fully at runtime so esbuild never statically resolves the path.
let sourceLocationBabelPlugin = null
try {
  const pluginPath = path.join(__dirname, 'build', 'sourceLocationBabelPlugin.cjs')
  if (fs.existsSync(pluginPath)) {
    const _require = createRequire(import.meta.url)
    sourceLocationBabelPlugin = _require(pluginPath)
  }
} catch (_) {
  // plugin not available — skip silently
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