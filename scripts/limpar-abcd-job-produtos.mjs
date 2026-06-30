#!/usr/bin/env node
/**
 * Limpa campos ABCD/IEP gravados pelo job em Produto (Base44).
 *
 * Uso:
 *   npm run abcd:limpar              # dry-run (só conta)
 *   npm run abcd:limpar -- --apply     # limpa tudo (lotes automáticos)
 *   npm run abcd:limpar -- --apply --somente-d   # só produtos com abcd=D
 *
 * Credenciais: VITE_BASE44_APP_ID + BASE44_ACCESS_TOKEN ou BASE44_API_KEY
 */
import { requireBase44Client } from './base44-env.mjs';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const somenteD = args.has('--somente-d');

const base44 = requireBase44Client();

async function invoke(body) {
  const resp = await base44.functions.invoke('limparAbcdJobProdutos', body);
  return resp?.data ?? resp;
}

console.log(apply ? '[abcd:limpar] Aplicando limpeza…' : '[abcd:limpar] Dry-run (use --apply para limpar)');

const preview = await invoke({ dry_run: true, somente_d: somenteD });
console.log(JSON.stringify(preview, null, 2));

if (!apply) {
  console.log('\nPara executar: npm run abcd:limpar -- --apply');
  process.exit(0);
}

let offset = 0;
let passo = 0;

while (true) {
  passo += 1;
  const result = await invoke({
    dry_run: false,
    somente_d: somenteD,
    offset,
    limit: 25,
  });
  console.log(`\n--- lote ${passo} ---`);
  console.log(JSON.stringify(result, null, 2));

  if (result?.status === 'concluido' || result?.next_offset == null) break;
  offset = Number(result.next_offset) || 0;
}

console.log('\n[abcd:limpar] Concluído.');
