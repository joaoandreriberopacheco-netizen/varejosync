#!/usr/bin/env node
/**
 * Copia entidades do Base44 para as tabelas `public.*` no Supabase (mesmo shape que o app grava).
 *
 * Pré-requisitos:
 *   - Base44: JWT com leitura (`BASE44_ACCESS_TOKEN` / `ACCESS_TOKEN`) **ou** chave de API (`BASE44_API_KEY`
 *     / `VITE_BASE44_API_KEY`), enviada no header `api_key` (SDK mescla `headers` no axios).
 *   - Opcional: `.env` e `.env.local` na raiz (lidos automaticamente; `.env.local` sobrepõe `.env`
 *     e qualquer variável já definida no shell — evita `DATABASE_URL` antiga tipo Docker).
 *   - Postgres: `DATABASE_URL` (connection string com password) — Dashboard → Database → URI.
 *   - Se `getaddrinfo ENOTFOUND` no Node (IPv6 só no router): ver `MIGRATE_DNS_SERVERS`, `MIGRATE_PG_HOST`,
 *     `MIGRATE_PG_SSL_INSECURE` no cabeçalho deste ficheiro.
 *
 * PowerShell:
 *   $env:VITE_BASE44_APP_ID = "..."
 *   $env:VITE_BASE44_BACKEND_URL = "https://p38.base44.app"   # ou https://base44.app
 *   $env:BASE44_ACCESS_TOKEN = "..."   # JWT (opcional se usar API key)
 *   $env:BASE44_API_KEY = "..."        # alternativa ao JWT (header api_key)
 *   $env:DATABASE_URL = "postgresql://postgres.[ref]:PASSWORD@...pooler.supabase.com:6543/postgres"
 *   npm run migrate:base44-to-supabase
 *
 * Opções:
 *   --dry-run        só conta linhas por tabela (não escreve)
 *   --limit=N        máximo de registos a puxar por entidade (default 10000; API permite 10k por pedido, pedidos em páginas)
 *   --only=Ent1,Ent2 só migra essas entidades (nomes PascalCase do Base44, como no mapa). Alternativa: env MIGRATE_ONLY_ENTITIES=Ent1,Ent2
 *   --delay-ms=N     pausa entre tabelas (rate limit / carga na API)
 *   --atomic         uma única transação para toda a migração (modo antigo; falhou = rollback total)
 *   --rows-per-commit=N em modo escalonado (default 250): grava em blocos de N linhas com COMMIT entre blocos.
 *                    0 = uma transação por tabela inteira (sem partir linhas). Env: MIGRATE_ROWS_PER_COMMIT
 *
 * Notas:
 *   - Modo escalonado (default): vários COMMIT — por blocos de linhas dentro de cada tabela; falha a meio deixa
 *     dados já gravados (re-correr o script sincroniza com ON CONFLICT).
 *   - `--atomic`: uma transação global (comportamento antigo; falha = rollback total).
 *   - Cada COMMIT usa `SET LOCAL session_replication_role = 'replica'` para relaxar FKs durante o upsert.
 *   - Listagem Base44 é paginada (10k/pedido); o limite `--limit` aplica ao total por entidade.
 *   - Faz `ON CONFLICT (id) DO UPDATE` — pode voltar a correr para sincronizar.
 *   - Tabelas partilhadas por mais do que um nome de entidade (ex.: User/Usuario) só são migradas uma vez.
 *
 * Ligação Postgres (Node não resolve o host, mas `nslookup` no PowerShell resolve):
 *   - Use a URI do pooler no Dashboard (host `*.pooler.supabase.com`, porta 6543) — por vezes tem IPv4.
 *   - Ou `MIGRATE_DNS_SERVERS=8.8.8.8,1.1.1.1` antes do `pg` resolver o nome.
 *   - Ou obtenha o IP: `Resolve-DnsName db.<ref>.supabase.co` e no `.env.local`:
 *       `MIGRATE_PG_HOST=2600:...` (IPv6) ou `MIGRATE_PG_HOST=x.x.x.x` (IPv4)
 *     deixando `DATABASE_URL` com user/password/porta/DB iguais; o script substitui só o host.
 *   - Se o TLS falhar ao usar IP: `MIGRATE_PG_SSL_INSECURE=true` (só migração local; risco MITM).
 */

import { createClient } from '@base44/sdk';
import fs from 'node:fs';
import dns from 'node:dns';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { ENTITY_TO_TABLE, resolveEntityMapping } from '../src/integrations/p38/entityTableMap.js';
import { prepareWritePayload } from '../src/integrations/p38/supabaseEntityLayer.js';

/** Preenche `process.env` a partir de `.env` e depois `.env.local` (ficheiros sobrepõem o shell). */
function loadDotEnvFiles() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  for (const name of ['.env', '.env.local']) {
    const filePath = path.join(root, name);
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    for (let line of text.split(/\r?\n/)) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;
      if (/^export\s+/i.test(line)) line = line.replace(/^export\s+/i, '').trim();
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      val = val.replace(/\\n/g, '\n');
      process.env[key] = val;
    }
  }
}

loadDotEnvFiles();

function applyMigrateDnsServers() {
  const list = process.env.MIGRATE_DNS_SERVERS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!list?.length) return;
  dns.setServers(list);
  console.log(`[migrate] MIGRATE_DNS_SERVERS: ${list.join(', ')}`);
}

/** Substitui o host de `DATABASE_URL` (ex.: IP de `Resolve-DnsName` quando Node dá ENOTFOUND). */
function finalizeDatabaseUrl(databaseUrl) {
  const hostOverride = process.env.MIGRATE_PG_HOST?.trim();
  if (!hostOverride) return databaseUrl;
  const cleaned = hostOverride.replace(/^\[|]$/g, '');
  try {
    const u = new URL(databaseUrl);
    const port = u.port || '5432';
    const hostWithPort = cleaned.includes(':')
      ? `[${cleaned}]:${port}`
      : `${cleaned}:${port}`;
    u.host = hostWithPort;
    console.log('[migrate] Host Postgres substituído por MIGRATE_PG_HOST.');
    return u.toString();
  } catch (e) {
    console.error('[migrate] DATABASE_URL inválida ao aplicar MIGRATE_PG_HOST:', e.message);
    process.exit(1);
  }
}

function buildPgPoolConfig(connectionString) {
  const cfg = { connectionString, max: 1 };
  const insecure =
    process.env.MIGRATE_PG_SSL_INSECURE === 'true' ||
    process.env.MIGRATE_PG_SSL_INSECURE === '1';
  if (insecure) {
    cfg.ssl = { rejectUnauthorized: false };
    console.warn('[migrate] SSL: rejectUnauthorized=false (MIGRATE_PG_SSL_INSECURE)');
  }
  return cfg;
}

const DEFAULT_LIST_LIMIT = 10_000;

/** Máximo por pedido na API Base44 (`Limit too high - maximum allowed is 10000`). */
const BASE44_LIST_PAGE_SIZE = 10_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunkArray(arr, size) {
  if (!size || size <= 0) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Ordem aproximada para quando não usamos replica (não usado se replica OK). Mantido como documentação. */
const TABLE_PRIORITY = [
  'terceiro',
  'categoria_produto',
  'categoria_financeira',
  'tabela_preco',
  'formas_de_pagamento',
  'contas_financeiras',
  'produto',
  'turno_caixa',
  'pedido_venda',
  'pedido_compra',
  'embarque',
  'conta_recorrente',
  'conta_prevista',
  'movimentacao_estoque',
  'lancamento_financeiro',
  'agenda_logistica',
  'movimentos_caixa',
  'target_flare',
  'catalogo_interface',
];

const ENTITY_CANDIDATES_BY_TABLE = {
  usuario: ['User', 'Usuario'],
  categoria_produto: ['CategoriaProduto', 'Categoria'],
};

/** Em modo escalonado: COMMIT a cada N linhas por tabela (default). 0 = tabela inteira num COMMIT. */
const DEFAULT_ROWS_PER_COMMIT = 250;

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const atomic = argv.includes('--atomic');
  let limit = DEFAULT_LIST_LIMIT;
  let onlyEntities = null;
  let delayMs = 0;
  let rowsPerCommit = DEFAULT_ROWS_PER_COMMIT;

  const envRows = process.env.MIGRATE_ROWS_PER_COMMIT;
  if (envRows !== undefined && envRows !== '') {
    rowsPerCommit = Math.max(0, Number(envRows) || DEFAULT_ROWS_PER_COMMIT);
  }

  const envOnly = process.env.MIGRATE_ONLY_ENTITIES?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (envOnly?.length) onlyEntities = envOnly;

  for (const a of argv) {
    if (a.startsWith('--limit=')) {
      const n = Number(a.slice('--limit='.length));
      limit = Math.min(Math.max(1, n || DEFAULT_LIST_LIMIT), 500_000);
    }
    if (a.startsWith('--only=')) {
      const list = a
        .slice('--only='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      onlyEntities = list.length ? list : null;
    }
    if (a.startsWith('--delay-ms=')) {
      delayMs = Math.max(0, Number(a.slice('--delay-ms='.length)) || 0);
    }
    if (a.startsWith('--rows-per-commit=')) {
      rowsPerCommit = Math.max(0, Number(a.slice('--rows-per-commit='.length)) || 0);
    }
  }
  return { dryRun, limit, onlyEntities, delayMs, atomic, rowsPerCommit };
}

function collectTables(onlyEntities) {
  const set = new Set();
  const names = onlyEntities?.length ? onlyEntities : Object.keys(ENTITY_TO_TABLE);
  for (const entityName of names) {
    const m = resolveEntityMapping(entityName);
    if (!m?.table) {
      if (onlyEntities?.length) {
        console.warn(`[migrate] --only: "${entityName}" não está em ENTITY_TO_TABLE — ignorada.`);
      }
      continue;
    }
    set.add(m.table);
  }
  if (onlyEntities?.length && set.size === 0) {
    console.error('[migrate] --only não correspondeu a nenhuma tabela (nomes PascalCase?).');
    process.exit(1);
  }
  return [...set];
}

function orderTables(tables) {
  const pri = TABLE_PRIORITY.filter((t) => tables.includes(t));
  const rest = tables.filter((t) => !pri.includes(t)).sort();
  return [...pri, ...rest];
}

function entityCandidatesForTable(table) {
  const all = Object.keys(ENTITY_TO_TABLE).filter((name) => resolveEntityMapping(name)?.table === table);
  const preferred = ENTITY_CANDIDATES_BY_TABLE[table];
  if (!preferred) return [...all].sort();
  const ordered = [
    ...preferred.filter((n) => all.includes(n)),
    ...all.filter((n) => !preferred.includes(n)).sort(),
  ];
  return ordered;
}

function getBase44Env() {
  const appId = process.env.VITE_BASE44_APP_ID || process.env.BASE44_APP_ID || '';
  const serverUrl =
    process.env.VITE_BASE44_BACKEND_URL || process.env.BASE44_BACKEND_URL || 'https://base44.app';
  const token = (process.env.BASE44_ACCESS_TOKEN || process.env.ACCESS_TOKEN || '').trim();
  const apiKey = (process.env.BASE44_API_KEY || process.env.VITE_BASE44_API_KEY || '').trim();
  return { appId, serverUrl, token, apiKey };
}

function requireEnv() {
  applyMigrateDnsServers();
  const { appId, serverUrl, token, apiKey } = getBase44Env();
  if (!appId || (!token && !apiKey)) {
    console.error(
      '[migrate] Defina VITE_BASE44_APP_ID (ou BASE44_APP_ID) e autenticação Base44: ' +
        'BASE44_ACCESS_TOKEN (ou ACCESS_TOKEN) e/ou BASE44_API_KEY (ou VITE_BASE44_API_KEY).'
    );
    process.exit(1);
  }
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl) {
    console.error('[migrate] Defina DATABASE_URL (connection string Postgres do Supabase).');
    process.exit(1);
  }
  const databaseUrl = finalizeDatabaseUrl(rawUrl);
  return { appId, serverUrl, token, apiKey, databaseUrl };
}

async function listAllForEntity(base44, entityName, limit) {
  const api = base44.entities?.[entityName];
  if (!api || typeof api.list !== 'function') {
    return { rows: [], skipped: true };
  }
  const maxTotal = Math.max(0, limit);
  try {
    const all = [];
    let skip = 0;
    while (all.length < maxTotal) {
      const page = Math.min(BASE44_LIST_PAGE_SIZE, maxTotal - all.length);
      const rows = await api.list('-created_date', page, skip);
      const list = Array.isArray(rows) ? rows : [];
      if (list.length === 0) break;
      all.push(...list);
      skip += list.length;
      if (list.length < page) break;
    }
    return { rows: all, skipped: false };
  } catch (e) {
    console.warn(`[migrate] ${entityName}.list() falhou: ${e.message}`);
    return { rows: [], skipped: false, error: e };
  }
}

function serializeCell(val) {
  if (val === undefined) return null;
  if (val === null) return null;
  // Objetos / arrays: o driver `pg` serializa para JSON/JSONB; não usar JSON.stringify duplo.
  if (typeof val === 'object' && val !== null && !Buffer.isBuffer(val)) {
    return val;
  }
  return val;
}

async function upsertBatch(client, table, rows, allowedCols) {
  for (const row of rows) {
    const clean = {};
    for (const [k, v] of Object.entries(row)) {
      if (v === undefined) continue;
      if (allowedCols && !allowedCols.has(k)) continue;
      clean[k] = v;
    }
    if (!clean.id) {
      console.warn(`[migrate] Linha sem id na tabela ${table}, ignorada.`);
      continue;
    }
    const keys = Object.keys(clean);
    const colList = keys.map((k) => `"${k.replace(/"/g, '""')}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((k) => serializeCell(clean[k]));
    const updateSet = keys
      .filter((k) => k !== 'id')
      .map((k) => `"${k.replace(/"/g, '""')}" = EXCLUDED."${k.replace(/"/g, '""')}"`)
      .join(', ');
    const sql =
      `INSERT INTO public.${table.replace(/[^a-z0-9_]/gi, '')} (${colList}) VALUES (${placeholders}) ` +
      `ON CONFLICT (id) DO UPDATE SET ${updateSet || '"id" = EXCLUDED."id"'}`;
    await client.query(sql, values);
  }
}

async function upsertInReplicaSession(client, table, rows, allowedCols) {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL session_replication_role = 'replica'");
    await upsertBatch(client, table, rows, allowedCols);
    await client.query("SET LOCAL session_replication_role = 'origin'");
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  }
}

async function loadTableColumns(client, table) {
  const r = await client.query(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
    [table]
  );
  return new Set(r.rows.map((x) => x.column_name));
}

async function main() {
  const { dryRun, limit, onlyEntities, delayMs, atomic, rowsPerCommit } = parseArgs(
    process.argv.slice(2)
  );
  const { appId, serverUrl, token, apiKey, databaseUrl } = requireEnv();

  const base44 = createClient({
    appId,
    serverUrl,
    ...(token ? { token } : {}),
    ...(apiKey ? { headers: { api_key: apiKey } } : {}),
    requiresAuth: Boolean(token || apiKey),
  });

  const tables = orderTables(collectTables(onlyEntities));
  const migratedTables = new Set();

  const authMode =
    token && apiKey ? 'jwt+api_key' : token ? 'jwt' : apiKey ? 'api_key' : 'none';
  console.log(`[migrate] Base44: ${serverUrl} (auth: ${authMode})`);
  console.log(`[migrate] Tabelas: ${tables.length} (dry-run=${dryRun})`);
  if (onlyEntities?.length) {
    console.log(`[migrate] Filtro --only: ${onlyEntities.length} nome(s) de entidade → ${tables.length} tabela(s)`);
  }
  console.log(`[migrate] Limite listagem Base44: ${limit} / entidade`);
  if (delayMs) console.log(`[migrate] Pausa entre tabelas: ${delayMs} ms`);
  if (!dryRun) {
    if (atomic) {
      console.log('[migrate] Modo: uma transação global (--atomic)');
    } else {
      console.log(
        `[migrate] Modo: escalonado — COMMIT a cada ${rowsPerCommit > 0 ? rowsPerCommit + ' linhas' : 'tabela completa'} por tabela`
      );
    }
  }

  if (dryRun) {
    for (const table of tables) {
      const candidates = entityCandidatesForTable(table);
      let n = 0;
      for (const entityName of candidates) {
        const { rows } = await listAllForEntity(base44, entityName, limit);
        if (rows.length) {
          n = rows.length;
          console.log(`[dry-run] ${table} ← ${entityName}: ${n}`);
          break;
        }
      }
      if (!n) console.log(`[dry-run] ${table}: 0 (sem dados ou entidade ausente)`);
      if (delayMs) await sleep(delayMs);
    }
    return;
  }

  const pool = new pg.Pool(buildPgPoolConfig(databaseUrl));
  const client = await pool.connect();
  try {
    if (atomic) {
      await client.query('BEGIN');
      await client.query("SET LOCAL session_replication_role = 'replica'");
    }

    for (const table of tables) {
      if (migratedTables.has(table)) continue;

      const candidates = entityCandidatesForTable(table);
      let sourceEntity = null;
      let rawRows = [];

      for (const entityName of candidates) {
        const { rows, skipped } = await listAllForEntity(base44, entityName, limit);
        if (skipped) continue;
        if (rows.length) {
          sourceEntity = entityName;
          rawRows = rows;
          break;
        }
      }

      if (!rawRows.length) {
        console.log(`[migrate] ${table}: vazio / ignorado`);
        migratedTables.add(table);
        if (delayMs) await sleep(delayMs);
        continue;
      }

      const mapping = resolveEntityMapping(sourceEntity);
      const prepared = rawRows.map((r) => prepareWritePayload({ ...r }, sourceEntity, mapping));

      const allowedCols = await loadTableColumns(client, table);
      if (!allowedCols.has('id')) {
        console.warn(`[migrate] Tabela ${table} sem coluna id — ignorada.`);
        migratedTables.add(table);
        if (delayMs) await sleep(delayMs);
        continue;
      }

      console.log(`[migrate] ${table} ← ${sourceEntity}: ${prepared.length} linhas…`);

      if (atomic) {
        await upsertBatch(client, table, prepared, allowedCols);
      } else {
        const chunks = chunkArray(prepared, rowsPerCommit);
        let partNum = 0;
        for (const part of chunks) {
          partNum += 1;
          await upsertInReplicaSession(client, table, part, allowedCols);
          if (chunks.length > 1) {
            console.log(`[migrate]   … commit parcial ${partNum}/${chunks.length} (${part.length} linhas)`);
          }
        }
      }

      migratedTables.add(table);
      if (delayMs) await sleep(delayMs);
    }

    if (atomic) {
      await client.query("SET LOCAL session_replication_role = 'origin'");
      await client.query('COMMIT');
    }
    console.log('[migrate] Concluído com sucesso.');
  } catch (e) {
    if (atomic) await client.query('ROLLBACK').catch(() => {});
    console.error('[migrate] Erro:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

// SDK pode deixar sockets / timers abertos; sem isto o Node não termina após dry-run ou sucesso.
main()
  .catch((e) => {
    console.error('[migrate] Falha:', e);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode != null ? process.exitCode : 0);
  });
