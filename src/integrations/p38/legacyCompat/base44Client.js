/**
 * Shim que substitui `@base44/vite-plugin/compat/base44Client.cjs` em build time
 * (via plugin custom em `vite.config.js`).
 *
 * O compat layer original (`compat/entities.cjs`, `compat/functions.cjs`,
 * `compat/integrations.cjs`, `compat/agents.cjs`) faz `require('./base44Client.cjs')`
 * e cria sua própria instância do SDK Base44 — ignorando o nosso bypass para Supabase.
 *
 * Aqui exportamos o `base44` que já vem do nosso `@/api/base44Client`, que aponta
 * para `p38.legacyClient` (Supabase, Subpayze ou Base44 conforme provider ativo).
 *
 * Importante: precisamos manter o shape `{ base44 }` esperado pelo CommonJS
 * do compat (`const { base44 } = require('./base44Client.cjs')`).
 */
import { base44 as p38Base44 } from '@/api/base44Client';

export const base44 = p38Base44;
export default { base44: p38Base44 };
