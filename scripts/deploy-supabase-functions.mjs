#!/usr/bin/env node
/**
 * Deploy de todas as Edge Functions em supabase/functions/ (exceto _shared).
 *
 * Requer:
 *   SUPABASE_ACCESS_TOKEN — Personal Access Token (supabase.com/dashboard/account/tokens)
 *   SUPABASE_PROJECT_REF  — ref do projecto (URL https://[ref].supabase.co)
 *
 * Uso:
 *   npm run supabase:deploy:functions
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const functionsDir = path.join(root, 'supabase', 'functions');

function resolveProjectRef() {
  const explicit = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicit) return explicit;

  const url = process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  if (!url) return null;

  try {
    const host = new URL(url).hostname;
    const ref = host.split('.')[0];
    return ref || null;
  } catch {
    return null;
  }
}

function listFunctionNames() {
  if (!fs.existsSync(functionsDir)) return [];
  return fs
    .readdirSync(functionsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_shared')
    .map((d) => d.name)
    .sort();
}

export async function deploySupabaseFunctions({ dryRun = false } = {}) {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef = resolveProjectRef();

  if (!token) {
    throw new Error('SUPABASE_ACCESS_TOKEN é obrigatório (Dashboard → Account → Access Tokens).');
  }
  if (!projectRef) {
    throw new Error(
      'SUPABASE_PROJECT_REF ou VITE_SUPABASE_URL é obrigatório para identificar o projecto.'
    );
  }

  const names = listFunctionNames();
  if (names.length === 0) {
    console.log('[supabase:deploy:functions] Nenhuma função em supabase/functions/.');
    return { deployed: [], projectRef };
  }

  console.log(`[supabase:deploy:functions] Projecto ${projectRef} — ${names.length} função(ões).`);

  const deployed = [];
  for (const name of names) {
    process.stdout.write(`  → ${name} … `);
    if (dryRun) {
      console.log('dry-run');
      deployed.push(name);
      continue;
    }

    const result = spawnSync(
      'npx',
      ['--yes', 'supabase@latest', 'functions', 'deploy', name, '--project-ref', projectRef, '--use-api'],
      {
        cwd: root,
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    if (result.status !== 0) {
      console.log('FALHOU');
      const errText = (result.stderr || result.stdout || '').trim();
      throw new Error(`Deploy ${name} falhou: ${errText.slice(0, 800)}`);
    }
    console.log('ok');
    deployed.push(name);
  }

  return { deployed, projectRef };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  try {
    const { deployed, projectRef } = await deploySupabaseFunctions({ dryRun });
    console.log(
      `[supabase:deploy:functions] Concluído (${projectRef}):`,
      deployed.join(', ')
    );
  } catch (err) {
    console.error('[supabase:deploy:functions]', err.message);
    process.exit(1);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
