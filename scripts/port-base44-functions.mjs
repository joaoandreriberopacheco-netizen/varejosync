#!/usr/bin/env node
// Gera Edge Functions Supabase a partir de base44/functions (entry.ts)
// Uso: node scripts/port-base44-functions.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const base44Dir = path.join(root, 'base44', 'functions');
const functionsDir = path.join(root, 'supabase', 'functions');
const handlersDir = path.join(functionsDir, '_shared', 'handlers');

/** Já portados manualmente (não sobrescrever). */
const SKIP = new Set([
  'gerenciarPin',
  'processarVendaCaixa',
  'cancelarLancamentoFinanceiro',
  'auditarSaldosContas',
  'enviarFinanceiroLote',
  'corrigirMovimentosRecepcaoRetroativos',
  // SQL/pg_cron/trigger only — sem entry Base44 invocável
  'recalcularEstoqueProduto',
  'sincronizarEstoquePorMovimentacao',
  'atualizarStatusLancamentos',
  'processarLiquidacaoCartaoCredito',
  'sincronizarDelecaoLancamentos',
  'generateProductImages',
]);

/** RPC wrappers gerados separadamente. */
const RPC_ONLY = new Map([
  ['gerarNumeroSequencial', 'gerar_numero_sequencial'],
]);

function toKebab(name) {
  return String(name).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function transformEntry(name, content) {
  let code = content;
  code = code.replace(/^import \{ createClientFromRequest \} from ['"]npm:@base44\/sdk@[^'"]+['"];?\s*/gm, '');
  code = code.replace(/^import \{ createClientFromRequest \} from ['"]npm:@base44\/sdk['"];?\s*/gm, '');

  if (!code.includes('Deno.serve')) {
    throw new Error('sem Deno.serve');
  }

  code = code.replace(
    /Deno\.serve\(\s*async\s*\(\s*req\s*\)\s*=>\s*\{/,
    'export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {',
  );
  code = code.replace(/\}\);\s*$/, '}\n');

  code = code.replace(
    /const base44 = createClientFromRequest\(req\);/g,
    '// base44 injetado por servePorted',
  );
  code = code.replace(
    /const base44 = await createClientFromRequest\(req\);/g,
    '// base44 injetado por servePorted',
  );

  const header = `// Port automático de base44/functions/${name}/entry.ts
import type { createP38Client } from '../p38Client.ts';

`;
  return header + code;
}

function writeRpcWrapper(name, rpcName) {
  const kebab = toKebab(name);
  const dir = path.join(functionsDir, kebab);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'index.ts'),
    `// RPC wrapper: ${rpcName}
import { requireUser, jsonResponse } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => ({}));
  const { data, error } = await auth.client.rpc('${rpcName}', body);
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse(data);
});
`,
  );
}

function writeEdgeWrapper(name) {
  const kebab = toKebab(name);
  const dir = path.join(functionsDir, kebab);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'index.ts'),
    `import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/${name}.ts';
Deno.serve(servePorted(handle));
`,
  );
}

fs.mkdirSync(handlersDir, { recursive: true });

const names = fs.readdirSync(base44Dir).filter((n) => {
  const entry = path.join(base44Dir, n, 'entry.ts');
  return fs.existsSync(entry) && fs.statSync(entry).size > 0;
});

let ported = 0;
let skipped = 0;
let rpc = 0;
const errors = [];

for (const name of names.sort()) {
  if (SKIP.has(name)) {
    skipped++;
    continue;
  }

  if (RPC_ONLY.has(name)) {
    writeRpcWrapper(name, RPC_ONLY.get(name));
    rpc++;
    continue;
  }

  const entryPath = path.join(base44Dir, name, 'entry.ts');
  const raw = fs.readFileSync(entryPath, 'utf8');
  if (!raw.trim()) {
    skipped++;
    continue;
  }

  try {
    const handler = transformEntry(name, raw);
    fs.writeFileSync(path.join(handlersDir, `${name}.ts`), handler);
    writeEdgeWrapper(name);
    ported++;
  } catch (e) {
    errors.push({ name, error: String(e.message || e) });
  }
}

console.log(JSON.stringify({ ported, skipped, rpc, errors: errors.slice(0, 10), total: names.length }, null, 2));
