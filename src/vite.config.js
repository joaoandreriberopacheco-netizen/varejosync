import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import base44 from '@base44/vite-plugin'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// sourceLocationBabelPlugin — injects data-source-location for Flare Mode
// Uses a fully dynamic require so esbuild cannot statically resolve the path
let sourceLocationBabelPlugin = null
const pluginPath = path.join(__dirname, 'build', 'sourceLocationBabelPlugin.cjs')
if (fs.existsSync(pluginPath)) {
  try {
    const _require = createRequire(import.meta.url)
    // Defeat static analysis: build path at runtime
    const dynamicPath = [pluginPath].find(Boolean)
    sourceLocationBabelPlugin = _require(dynamicPath)
  } catch (_) {
    // plugin not loadable — skip silently
  }
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