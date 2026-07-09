#!/usr/bin/env node
/**
 * Gera código alfanumérico canônico (XXX-XXX) para todo produto sem padrão novo.
 *
 * Uso:
 *   npm run produto:codigo:backfill            # dry-run
 *   npm run produto:codigo:backfill -- --apply # aplica updates
 */
import { requireBase44Client } from './base44-env.mjs';
import {
  generateRandomProductCode,
  isCanonicalProductCode,
  normalizeProductCodeForSearch,
} from '../src/lib/productCode.js';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const base44 = requireBase44Client();

function byCreatedDateAsc(a, b) {
  const da = new Date(a?.created_date || 0).getTime();
  const db = new Date(b?.created_date || 0).getTime();
  return da - db;
}

const produtos = await base44.entities.Produto.list();
const ordered = [...(produtos || [])].sort(byCreatedDateAsc);

const takenCodes = new Set(
  ordered
    .filter((p) => isCanonicalProductCode(p?.codigo_interno))
    .map((p) => normalizeProductCodeForSearch(p?.codigo_interno))
    .filter(Boolean),
);

const updates = [];

for (const produto of ordered) {
  if (isCanonicalProductCode(produto?.codigo_interno)) continue;
  const novoCodigo = generateRandomProductCode(takenCodes);
  takenCodes.add(normalizeProductCodeForSearch(novoCodigo));
  updates.push({
    id: produto.id,
    nome: produto.nome || '',
    codigo_atual: produto?.codigo_interno || '',
    novo_codigo: novoCodigo,
  });
}

console.log(
  JSON.stringify(
    {
      total_produtos: ordered.length,
      codigos_canonicos: ordered.length - updates.length,
      precisam_atualizar: updates.length,
      apply,
      amostra: updates.slice(0, 10),
    },
    null,
    2,
  ),
);

if (!apply) {
  console.log('\nDry-run concluído. Para aplicar: npm run produto:codigo:backfill -- --apply');
  process.exit(0);
}

let done = 0;
for (const item of updates) {
  await base44.entities.Produto.update(item.id, { codigo_interno: item.novo_codigo });
  done += 1;
  if (done % 25 === 0 || done === updates.length) {
    console.log(`[produto:codigo:backfill] ${done}/${updates.length}`);
  }
}

console.log('[produto:codigo:backfill] Concluído.');
