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

async function loadUsuarioColumns(client) {
  const { rows } = await client.query(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'usuario'`
  );
  return new Set(rows.map((r) => r.column_name));
}

function emailExpr(cols, alias = 'u') {
  const p = alias ? `${alias}.` : '';
  if (cols.has('email')) {
    return `coalesce(nullif(trim(${p}email), ''), nullif(trim(${p}dados->>'email'), ''))`;
  }
  return `nullif(trim(${p}dados->>'email'), '')`;
}

function fullNameExpr(cols, alias = 'u') {
  const p = alias ? `${alias}.` : '';
  if (cols.has('full_name')) {
    return `coalesce(nullif(trim(${p}full_name), ''), nullif(trim(${p}dados->>'full_name'), ''))`;
  }
  return `nullif(trim(${p}dados->>'full_name'), '')`;
}

function buildPlatformUserWhere(cols) {
  return `
    ${emailExpr(cols, 'u')} is null
    and (
      u.dados ? '_app_role'
      or u.dados ? 'app_id'
      or lower(coalesce(u.dados->>'is_service', 'false')) in ('true', 't', '1')
    )
  `;
}

function buildBackfillSql(cols) {
  const sets = [];
  if (cols.has('email')) sets.push(`email = coalesce(nullif(trim(email), ''), nullif(trim(dados->>'email'), ''))`);
  if (cols.has('full_name')) sets.push(`full_name = coalesce(nullif(trim(full_name), ''), nullif(trim(dados->>'full_name'), ''))`);
  if (cols.has('role')) sets.push(`role = coalesce(nullif(trim(role), ''), nullif(trim(dados->>'role'), ''), 'user')`);
  if (cols.has('nickname')) sets.push(`nickname = coalesce(nickname, dados->>'nickname')`);
  if (cols.has('perfil')) sets.push(`perfil = coalesce(perfil, dados->>'perfil')`);
  if (cols.has('perfil_acesso_id')) sets.push(`perfil_acesso_id = coalesce(perfil_acesso_id, dados->>'perfil_acesso_id')`);
  if (cols.has('perfil_acesso_nome')) sets.push(`perfil_acesso_nome = coalesce(perfil_acesso_nome, dados->>'perfil_acesso_nome')`);
  if (!sets.length) return null;
  return `update public.usuario set ${sets.join(', ')} where dados is not null and dados <> '{}'::jsonb`;
}

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

async function summarize(client, cols) {
  const email = emailExpr(cols, '');
  const fullName = fullNameExpr(cols, '');
  const perfilExpr = cols.has('perfil_acesso_nome')
    ? `coalesce(nullif(trim(perfil_acesso_nome), ''), dados->>'perfil_acesso_nome')`
    : `dados->>'perfil_acesso_nome'`;

  const { rows } = await client.query(`
    select
      count(*)::int as total,
      count(*) filter (where ${email} is not null)::int as com_email
    from public.usuario
  `);
  const sample = await client.query(`
    select id,
      ${email} as email,
      ${fullName} as full_name,
      ${perfilExpr} as perfil
    from public.usuario
    order by coalesce(${fullName}, ${email}, id)
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
    const cols = await loadUsuarioColumns(client);
    const platformWhere = buildPlatformUserWhere(cols);
    const backfillSql = buildBackfillSql(cols);

    if (!skipCleanup) {
      if (dryRun) {
        const { rows } = await client.query(
          `select count(*)::int as n from public.usuario u where ${platformWhere}`
        );
        console.log(`[usuario:resync] dry-run: apagaria ${rows[0].n} linha(s) de plataforma (User auth).`);
      } else {
        const del = await client.query(`delete from public.usuario u where ${platformWhere}`);
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

    if (!dryRun && backfillSql) {
      await client.query(backfillSql);
      console.log('[usuario:resync] colunas promovidas preenchidas a partir de dados jsonb.');
    }

    await summarize(client, cols);

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
