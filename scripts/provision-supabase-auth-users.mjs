#!/usr/bin/env node
/**
 * Cria ou actualiza utilizadores em auth.users a partir de `public.usuario` (emails operacionais).
 *
 * O login Supabase (`fetchUsuarioOperacional`) liga auth.users → public.usuario pelo email.
 *
 * Uso:
 *   VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... npm run usuario:provision-auth
 *   npm run usuario:provision-auth -- --dry-run
 *   npm run usuario:provision-auth -- --create   (createUser confirmado, sem email de convite)
 *
 * Por defeito envia convite por email (`inviteUserByEmail`) para cada utilizador sem conta auth.
 */
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

import { loadDotEnvFiles } from './base44-env.mjs';
import { resolveSupabaseDeployEnv } from './supabase-env.mjs';

loadDotEnvFiles();

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    createMode: argv.includes('--create'),
  };
}

function pgConfig(databaseUrl) {
  const cfg = { connectionString: databaseUrl, max: 1 };
  if (databaseUrl.includes('supabase')) {
    cfg.ssl = { rejectUnauthorized: false };
  }
  return cfg;
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function resolveSupabaseUrl() {
  return (
    process.env.VITE_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ''
  );
}

function resolveServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    ''
  );
}

async function loadOperacionalUsers(client) {
  const { rows } = await client.query(`
    select
      id,
      coalesce(nullif(trim(email), ''), nullif(trim(dados->>'email'), '')) as email,
      coalesce(nullif(trim(full_name), ''), nullif(trim(dados->>'full_name'), '')) as full_name,
      coalesce(nullif(trim(role), ''), nullif(trim(dados->>'role'), ''), 'user') as role,
      coalesce(perfil_acesso_id, dados->>'perfil_acesso_id') as perfil_acesso_id,
      coalesce(perfil_acesso_nome, dados->>'perfil_acesso_nome') as perfil_acesso_nome,
      coalesce(nickname, dados->>'nickname') as nickname
    from public.usuario
    where coalesce(nullif(trim(email), ''), nullif(trim(dados->>'email'), '')) is not null
    order by email
  `);
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push({ ...row, email });
  }
  return out;
}

async function listAuthUsersByEmail(admin) {
  const map = new Map();
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    for (const u of users) {
      const em = normalizeEmail(u.email);
      if (em) map.set(em, u);
    }
    if (users.length < perPage) break;
    page += 1;
  }
  return map;
}

function buildMetadata(row) {
  return {
    full_name: row.full_name || row.email,
    role: row.role || 'user',
    perfil_acesso_id: row.perfil_acesso_id || null,
    perfil_acesso_nome: row.perfil_acesso_nome || null,
    nickname: row.nickname || null,
    usuario_operacional_id: row.id,
  };
}

async function main() {
  const { dryRun, createMode } = parseArgs(process.argv.slice(2));
  const supabaseUrl = resolveSupabaseUrl();
  const serviceKey = resolveServiceRoleKey();
  const { databaseUrl } = resolveSupabaseDeployEnv();

  if (!supabaseUrl || !serviceKey) {
    console.error(
      '[usuario:provision-auth] Defina VITE_SUPABASE_URL (ou SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.'
    );
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error('[usuario:provision-auth] DATABASE_URL em falta (leitura de public.usuario).');
    process.exit(1);
  }

  const pool = new pg.Pool(pgConfig(databaseUrl));
  const client = await pool.connect();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const operacionais = await loadOperacionalUsers(client);
    if (!operacionais.length) {
      console.error(
        '[usuario:provision-auth] Nenhum utilizador com email em public.usuario. ' +
          'Corra primeiro: npm run usuario:resync'
      );
      process.exit(1);
    }

    console.log(`[usuario:provision-auth] ${operacionais.length} utilizador(es) operacional(is) com email.`);
    const authByEmail = dryRun ? new Map() : await listAuthUsersByEmail(supabase.auth.admin);

    const resultados = [];
    for (const row of operacionais) {
      const meta = buildMetadata(row);
      const existing = authByEmail.get(row.email);

      if (dryRun) {
        resultados.push({
          email: row.email,
          acao: existing ? 'atualizaria metadata' : createMode ? 'criaria (createUser)' : 'convidaria',
        });
        continue;
      }

      if (existing) {
        const { error } = await supabase.auth.admin.updateUserById(existing.id, {
          user_metadata: { ...(existing.user_metadata || {}), ...meta },
        });
        if (error) {
          resultados.push({ email: row.email, status: 'erro', erro: error.message });
        } else {
          resultados.push({ email: row.email, status: 'metadata_atualizada', auth_id: existing.id });
        }
        continue;
      }

      if (createMode) {
        const { data, error } = await supabase.auth.admin.createUser({
          email: row.email,
          email_confirm: true,
          user_metadata: meta,
        });
        if (error) {
          resultados.push({ email: row.email, status: 'erro', erro: error.message });
        } else {
          resultados.push({ email: row.email, status: 'criado', auth_id: data.user?.id });
        }
      } else {
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(row.email, {
          data: meta,
        });
        if (error) {
          resultados.push({ email: row.email, status: 'erro', erro: error.message });
        } else {
          resultados.push({ email: row.email, status: 'convidado', auth_id: data.user?.id });
        }
      }
    }

    for (const r of resultados) {
      console.log(`  ${r.email}: ${r.status || r.acao}${r.erro ? ` (${r.erro})` : ''}`);
    }

    const erros = resultados.filter((r) => r.status === 'erro').length;
    if (erros) process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[usuario:provision-auth]', err.message || err);
  process.exit(1);
});
