#!/usr/bin/env node
/**
 * Aplica todos os ficheiros em supabase/migrations/*.sql por ordem (001, 002, …).
 *
 * Uso (PowerShell):
 *   $env:DATABASE_URL = "postgresql://postgres.[PROJECT-REF]:SUA_SENHA@aws-0-...pooler.supabase.com:6543/postgres"
 *   npm run db:apply-migrations
 *
 * A URI está em: Supabase Dashboard → Project Settings → Database → Connection string → URI.
 * Use a senha da base que definiste ao criar o projeto (não é a anon key).
 *
 * Em algumas redes o pooler :6543 falha; experimente a URI "Direct connection" (:5432).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');

function listMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    console.error('[db:apply-migrations] Pasta não encontrada:', migrationsDir);
    process.exit(1);
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && /^\d{3}_/.test(f))
    .sort();
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error(
    '[db:apply-migrations] Defina DATABASE_URL com a connection string Postgres do Supabase.\n' +
      '  PowerShell: $env:DATABASE_URL = "postgresql://..."\n' +
      '  Depois: npm run db:apply-migrations'
  );
  process.exit(1);
}

const files = listMigrationFiles();
if (files.length === 0) {
  console.error('[db:apply-migrations] Nenhum ficheiro NNN_*.sql em', migrationsDir);
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined
});

console.log(`[db:apply-migrations] A ligar (${files.length} ficheiros)…`);

try {
  await client.connect();
  for (const file of files) {
    const full = path.join(migrationsDir, file);
    const sql = fs.readFileSync(full, 'utf8');
    process.stdout.write(`  → ${file} … `);
    try {
      await client.query(sql);
      console.log('ok');
    } catch (err) {
      console.log('FALHOU');
      console.error(err.message);
      if (err.position) console.error('(position)', err.position);
      process.exitCode = 1;
      break;
    }
  }
} catch (err) {
  console.error('[db:apply-migrations] Ligação:', err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

if (process.exitCode === 1) {
  process.exit(1);
}

console.log('[db:apply-migrations] Concluído. No Table Editor do Supabase deve aparecer public.produto, public.terceiro, etc.');
