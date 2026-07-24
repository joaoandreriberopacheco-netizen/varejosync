#!/usr/bin/env node
/**
 * Deploy completo Supabase: migrações SQL pendentes + Edge Functions.
 * Disparo CI: alterações em scripts/deploy-supabase*.mjs ou supabase/** (retry deploy).
 *
 * Secrets (Cloud Agent / .env.local / GitHub Actions):
 *   DATABASE_URL            — Postgres connection string
 *   SUPABASE_ACCESS_TOKEN   — PAT para deploy de Edge Functions
 *   SUPABASE_PROJECT_REF    — opcional se VITE_SUPABASE_URL estiver definido
 *
 * Uso:
 *   npm run supabase:deploy
 *   npm run supabase:deploy -- --dry-run
 *   npm run supabase:deploy -- --migrations-only
 *   npm run supabase:deploy -- --functions-only
 */

import { applySupabaseMigrations } from './apply-supabase-migrations.mjs';
import { deploySupabaseFunctions } from './deploy-supabase-functions.mjs';

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    migrationsOnly: argv.includes('--migrations-only'),
    functionsOnly: argv.includes('--functions-only'),
  };
}

async function main() {
  const { dryRun, migrationsOnly, functionsOnly } = parseArgs(process.argv.slice(2));
  const runMigrations = !functionsOnly;
  const runFunctions = !migrationsOnly;

  console.log('[supabase:deploy] Início', dryRun ? '(dry-run)' : '');

  if (runMigrations) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      console.error('[supabase:deploy] DATABASE_URL em falta — não é possível aplicar migrações.');
      process.exit(1);
    }
    const result = await applySupabaseMigrations({ databaseUrl, dryRun });
    console.log(
      '[supabase:deploy] Migrações:',
      dryRun ? `pendentes ${result.applied.length}` : `aplicadas ${result.applied.length}`
    );
  }

  if (runFunctions) {
    const { deployed, projectRef } = await deploySupabaseFunctions({ dryRun });
    console.log('[supabase:deploy] Edge Functions:', deployed.join(', ') || '(nenhuma)', `@ ${projectRef}`);
  }

  console.log('[supabase:deploy] Concluído.');
}

main().catch((err) => {
  console.error('[supabase:deploy]', err.message);
  process.exit(1);
});
