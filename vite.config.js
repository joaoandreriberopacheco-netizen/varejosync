import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sourceLocationBabelPlugin from './build/sourceLocationBabelPlugin.cjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Plugin custom que substitui o `compat/base44Client.cjs` interno do `@base44/vite-plugin`.
 *
 * Os arquivos compat (`compat/entities.cjs`, `compat/functions.cjs`, `compat/integrations.cjs`,
 * `compat/agents.cjs`) fazem `require('./base44Client.cjs')` e criam sua própria instância
 * do SDK Base44 — ignorando totalmente o nosso bypass para Supabase.
 *
 * Como `legacySDKImports` está ativo (necessário para `import ... from '@/entities/X'`),
 * todos os imports legacy do app vão para esses compat. Sem este shim, em modo bypass eles
 * tentam falar com `https://base44.app` com credenciais vazias e a tela fica em branco.
 *
 * Aqui interceptamos a resolução do `./base44Client.cjs` (somente quando o importer está
 * dentro do compat do plugin) e apontamos para `src/integrations/p38/legacyCompat/base44Client.js`,
 * que reexporta o `base44` resolvido pelo nosso provider P38 ativo.
 */
function p38LegacyBase44ClientOverride() {
  const overridePath = path.resolve(
    __dirname,
    'src/integrations/p38/legacyCompat/base44Client.js'
  )
  const compatMarker = path.join('@base44', 'vite-plugin', 'compat')
  const compatMarkerPosix = '@base44/vite-plugin/compat'

  function importerInsideCompat(importer) {
    if (!importer) return false
    return importer.includes(compatMarker) || importer.includes(compatMarkerPosix)
  }

  return {
    name: 'p38-legacy-base44-client-override',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!source) return null

      // Só queremos interceptar requires/imports que apontam para o `base44Client.cjs` do compat.
      const target = source.replace(/\\/g, '/')
      if (
        target === './base44Client.cjs' ||
        target.endsWith('/compat/base44Client.cjs')
      ) {
        if (importerInsideCompat(importer)) {
          return overridePath
        }
      }
      return null
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode ?? 'development', process.cwd(), '')
  const provider = (env.VITE_P38_PROVIDER || '').toLowerCase()
  const bypass =
    env.VITE_P38_BYPASS_BASE44 === 'true' ||
    env.VITE_P38_BYPASS_BASE44 === '1' ||
    provider === 'supabase'

  return {
    logLevel: 'error',
    server: {
      allowedHosts: true
    },
    plugins: [
      // O override precisa rodar ANTES do plugin do Base44 para vencer o resolveId interno.
      // Só ativa quando estamos em modo bypass — em modo Base44 real, o compat original
      // continua funcionando normalmente.
      ...(bypass ? [p38LegacyBase44ClientOverride()] : []),
      base44({
        // Continuamos com legacySDKImports=true: o app inteiro depende dos imports
        // `@/entities/X`, `@/functions/X`, etc. O override acima garante que os compat
        // delegam para o nosso `base44` (Supabase) em vez do SDK real.
        legacySDKImports:
          process.env.BASE44_LEGACY_SDK_IMPORTS !== 'false' &&
          process.env.BASE44_LEGACY_SDK_IMPORTS !== '0',
      }),
      react({
        babel: {
          plugins: [sourceLocationBabelPlugin],
        },
      }),
    ],
  }
});
