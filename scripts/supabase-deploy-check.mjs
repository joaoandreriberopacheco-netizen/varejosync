#!/usr/bin/env node
/**
 * Diagnóstico rápido antes de `npm run supabase:deploy`.
 * Não imprime valores de secrets — só presença e testes de ligação.
 */
import pg from 'pg';
import { loadDotEnvFiles } from './base44-env.mjs';
import { listMigrationFiles } from './apply-supabase-migrations.mjs';

loadDotEnvFiles();

function mask(name, value) {
  return value ? `${name}=ok` : `${name}=EM FALTA`;
}

function resolveProjectRef() {
  const explicit = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicit) return explicit;
  const url = process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

async function testDatabase(url) {
  const client = new pg.Client({
    connectionString: url.trim(),
    ssl: url.includes('supabase') ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    const { rows } = await client.query(
      `select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name = '_p38_schema_migrations'`
    );
    const hasTracking = rows[0]?.n > 0;
    let applied = 0;
    if (hasTracking) {
      const r = await client.query('select count(*)::int as n from public._p38_schema_migrations');
      applied = r.rows[0]?.n ?? 0;
    }
    return { ok: true, hasTracking, applied };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef = resolveProjectRef();

  console.log('[supabase:deploy:check] Secrets');
  console.log(' ', mask('DATABASE_URL', databaseUrl));
  console.log(' ', mask('SUPABASE_ACCESS_TOKEN', token));
  console.log(' ', mask('VITE_SUPABASE_URL / PROJECT_REF', projectRef || process.env.VITE_SUPABASE_URL));

  const migrations = listMigrationFiles();
  console.log(`\n[supabase:deploy:check] Migrações no repo: ${migrations.length}`);
  console.log('  última:', migrations.at(-1));

  if (databaseUrl) {
    process.stdout.write('\n[supabase:deploy:check] Teste DATABASE_URL … ');
    const db = await testDatabase(databaseUrl);
    if (db.ok) {
      console.log('ligação OK');
      console.log(`  tracking _p38_schema_migrations: ${db.hasTracking ? 'sim' : 'não (será criado)'}`);
      if (db.hasTracking) console.log(`  migrações já aplicadas: ${db.applied}`);
    } else {
      console.log('FALHOU');
      console.log(`  erro: ${db.error}`);
      console.log('  → Supabase Dashboard → Project Settings → Database → copiar connection string nova.');
    }
  }

  const readyMigrations = Boolean(databaseUrl);
  const readyFunctions = Boolean(token && projectRef);

  console.log('\n[supabase:deploy:check] Pronto para deploy?');
  console.log('  migrações:', readyMigrations ? (databaseUrl ? 'sim (se ligação OK)' : 'não') : 'não');
  console.log('  functions:', readyFunctions ? 'sim' : 'não');

  if (!readyFunctions) {
    console.log('\nPara Edge Functions, adiciona nos Secrets (Cursor Cloud + GitHub Actions):');
    console.log('  SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens');
    if (!projectRef) {
      console.log('  VITE_SUPABASE_URL      — https://[PROJECT_REF].supabase.co');
    }
  }

  if (!readyMigrations || !readyFunctions) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[supabase:deploy:check]', err.message);
  process.exit(1);
});
