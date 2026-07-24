#!/usr/bin/env node
/**
 * Re-sincroniza utilizadores operacionais P38 (entidade Base44 `Usuario`) para `public.usuario`.
 *
 * Problema que corrige: migração antiga usava `User` (auth da plataforma Base44) em vez de `Usuario`
 * (email, full_name, perfil_acesso_id). A UI UsuariosManager e o login Supabase dependem dos dados certos.
 *
 * Uso:
 *   DATABASE_URL=... VITE_BASE44_APP_ID=... BASE44_API_KEY=... npm run usuario:resync
 *   npm run usuario:resync -- --dry-run
 *   npm run usuario:resync -- --skip-cleanup   (só upsert, sem apagar linhas de plataforma)
 *
 * Depois de resync com emails válidos:
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run usuario:provision-auth
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { loadDotEnvFiles } from './base44-env.mjs';
import { resolveSupabaseDeployEnv } from './supabase-env.mjs';

loadDotEnvFiles();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    skipCleanup: argv.includes('--skip-cleanup'),
    skipMigrate: argv.includes('--skip-migrate'),
  };
}

function pgConfig(databaseUrl) {
  const cfg = { connectionString: databaseUrl, max: 1 };
  if (
    process.env.MIGRATE_PG_SSL_INSECURE === 'true' ||
    process.env.MIGRATE_PG_SSL_INSECURE === '1' ||
    databaseUrl.includes('supabase')
  ) {
    cfg.ssl = { rejectUnauthorized: false };
  }
  return cfg;
}

/** Linhas migradas por engano a partir de `User` (sem email operacional). */
const PLATFORM_USER_WHERE = `
  coalesce(nullif(trim(u.email), ''), nullif(trim(u.dados->>'email'), '')) is null
  and (
    u.dados ? '_app_role'
    or u.dados ? 'app_id'
    or lower(coalesce(u.dados->>'is_service', 'false')) in ('true', 't', '1')
  )
`;

const CLEANUP_PLATFORM_USERS_SQL = `delete from public.usuario u where ${PLATFORM_USER_WHERE}`;

const BACKFILL_COLUMNS_SQL = `
  update public.usuario set
    email = coalesce(nullif(trim(email), ''), nullif(trim(dados->>'email'), '')),
    full_name = coalesce(nullif(trim(full_name), ''), nullif(trim(dados->>'full_name'), '')),
    role = coalesce(nullif(trim(role), ''), nullif(trim(dados->>'role'), ''), 'user'),
    nickname = coalesce(nickname, dados->>'nickname'),
    perfil = coalesce(perfil, dados->>'perfil'),
    perfil_acesso_id = coalesce(perfil_acesso_id, dados->>'perfil_acesso_id'),
    perfil_acesso_nome = coalesce(perfil_acesso_nome, dados->>'perfil_acesso_nome')
  where dados is not null and dados <> '{}'::jsonb
`;

function runMigrate() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(root, 'scripts/migrate-base44-to-supabase.mjs'),
        '--only=Usuario',
        '--force-entity=Usuario',
      ],
      { cwd: root, stdio: 'inherit', env: process.env }
    );
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`migrate-base44-to-supabase saiu com código ${code}`));
    });
  });
}

async function summarize(client) {
  const { rows } = await client.query(`
    select
      count(*)::int as total,
      count(*) filter (
        where coalesce(nullif(trim(email), ''), nullif(trim(dados->>'email'), '')) is not null
      )::int as com_email
    from public.usuario
  `);
  const sample = await client.query(`
    select id,
      coalesce(nullif(trim(email), ''), dados->>'email') as email,
      coalesce(nullif(trim(full_name), ''), dados->>'full_name') as full_name,
      coalesce(nullif(trim(perfil_acesso_nome), ''), dados->>'perfil_acesso_nome') as perfil
    from public.usuario
    order by coalesce(full_name, dados->>'full_name', email, id)
    limit 12
  `);
  console.log(`[usuario:resync] total=${rows[0].total} com_email=${rows[0].com_email}`);
  for (const r of sample.rows) {
    console.log(`  - ${r.full_name || '(sem nome)'} <${r.email || 'sem email'}> [${r.perfil || '-'}]`);
  }
}

async function main() {
  const { dryRun, skipCleanup, skipMigrate } = parseArgs(process.argv.slice(2));
  const { databaseUrl } = resolveSupabaseDeployEnv();
  if (!databaseUrl) {
    console.error('[usuario:resync] DATABASE_URL em falta.');
    process.exit(1);
  }

  const pool = new pg.Pool(pgConfig(databaseUrl));
  const client = await pool.connect();

  try {
    if (!skipCleanup) {
      if (dryRun) {
        const { rows } = await client.query(
          `select count(*)::int as n from public.usuario u where ${PLATFORM_USER_WHERE}`
        );
        console.log(`[usuario:resync] dry-run: apagaria ${rows[0].n} linha(s) de plataforma (User auth).`);
      } else {
        const del = await client.query(CLEANUP_PLATFORM_USERS_SQL);
        console.log(`[usuario:resync] cleanup: ${del.rowCount} linha(s) de plataforma removida(s).`);
      }
    }

    if (!skipMigrate) {
      if (dryRun) {
        console.log('[usuario:resync] dry-run: correria migrate --only=Usuario --force-entity=Usuario');
      } else {
        console.log('[usuario:resync] a migrar entidade Usuario do Base44…');
        await runMigrate();
      }
    }

    if (!dryRun) {
      await client.query(BACKFILL_COLUMNS_SQL);
      console.log('[usuario:resync] colunas email/full_name/perfil preenchidas a partir de dados jsonb.');
    }

    await summarize(client);

    if (!dryRun) {
      console.log(
        '[usuario:resync] Próximo passo: npm run usuario:provision-auth (cria convites em auth.users).'
      );
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[usuario:resync]', err.message || err);
  process.exit(1);
});
