#!/usr/bin/env node
/**
 * Garante que DATABASE_URL e VITE_SUPABASE_URL apontam ao MESMO projecto Supabase.
 * Evita migrar dados numa BD e o frontend ler outra (sintoma: app vazia).
 */
import pg from 'pg';
import { resolveSupabaseDeployEnv } from './supabase-env.mjs';

function refFromSupabaseUrl(url) {
  if (!url) return null;
  try {
    return new URL(url.trim()).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

async function countProduto(databaseUrl) {
  const client = new pg.Client({
    connectionString: databaseUrl.trim(),
    ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    const { rows } = await client.query('select count(*)::int as n from public.produto');
    return rows[0]?.n ?? 0;
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  const { databaseUrl, projectRef: refFromDb } = resolveSupabaseDeployEnv();
  const refFromVite = refFromSupabaseUrl(process.env.VITE_SUPABASE_URL);

  if (!databaseUrl) {
    console.error('::error::DATABASE_URL em falta.');
    process.exit(1);
  }
  if (!refFromVite) {
    console.error('::error::VITE_SUPABASE_URL em falta (secret GitHub).');
    process.exit(1);
  }

  const dbRef = refFromDb || '(não resolvido)';
  console.log(`[align] VITE_SUPABASE_URL ref: ${refFromVite}`);
  console.log(`[align] DATABASE_URL ref:     ${dbRef}`);

  if (refFromDb && refFromDb !== refFromVite) {
    console.error(
      `::error::DATABASE_URL (${refFromDb}) ≠ VITE_SUPABASE_URL (${refFromVite}). ` +
        'Copia a connection string do MESMO projecto P38 no Supabase Dashboard → Database.'
    );
    process.exit(1);
  }

  console.log('[align] OK: refs alinhados.');

  if (process.argv.includes('--require-data')) {
    const n = await countProduto(databaseUrl);
    console.log(`[align] produto count: ${n}`);
    if (n === 0) {
      console.error(
        '::error::Tabela produto vazia neste projecto. Corre a migração Base44→Supabase com DATABASE_URL correcto.'
      );
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('[align]', err.message);
  process.exit(1);
});
