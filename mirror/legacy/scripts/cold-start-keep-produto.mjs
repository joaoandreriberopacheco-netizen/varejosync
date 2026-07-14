#!/usr/bin/env node
/**
 * Partida fria no Postgres do Supabase: TRUNCATE de todas as tabelas em `public`
 * exceto `produto` (catálogo mantém-se).
 *
 * PowerShell:
 *   $env:DATABASE_URL = "postgresql://postgres.[ref]:...@...pooler.supabase.com:6543/postgres"
 *   $env:CONFIRM_COLD_START = "1"
 *   npm run db:cold-start-keep-produto
 *
 * Sem CONFIRM_COLD_START=1 o script não corre (evita apagar dados por engano).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sqlPath = path.join(root, 'supabase', 'scripts', 'cold_start_keep_produto.sql');

function loadDotEnvFiles() {
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
      if (process.env[key] === undefined) process.env[key] = val.replace(/\\n/g, '\n');
    }
  }
}

loadDotEnvFiles();

const confirm = String(process.env.CONFIRM_COLD_START || '').trim();
if (confirm !== '1' && confirm.toLowerCase() !== 'true') {
  console.error(
    '[db:cold-start-keep-produto] Operação destrutiva. Defina CONFIRM_COLD_START=1 e DATABASE_URL.\n' +
      '  Isto trunca todas as tabelas em public exceto produto.'
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('[db:cold-start-keep-produto] Defina DATABASE_URL (connection string Postgres).');
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined
});

try {
  await client.connect();
  console.log('[db:cold-start-keep-produto] A executar', sqlPath, '…');
  await client.query(sql);
  console.log('[db:cold-start-keep-produto] Concluído. Apenas `public.produto` mantém linhas.');
} catch (e) {
  console.error('[db:cold-start-keep-produto]', e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

process.exit(process.exitCode ?? 0);
