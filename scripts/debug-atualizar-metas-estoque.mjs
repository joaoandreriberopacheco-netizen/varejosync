#!/usr/bin/env node
/**
 * Diagnóstico passo a passo do job atualizarMetasEstoque (engenharia reversa).
 *
 * Uso:
 *   node scripts/debug-atualizar-metas-estoque.mjs
 *   node scripts/debug-atualizar-metas-estoque.mjs --gravar   # após preparar, grava 1 bloco
 *   node scripts/debug-atualizar-metas-estoque.mjs --completo # preparar + todos os blocos
 *
 * Requer VITE_BASE44_APP_ID + BASE44_ACCESS_TOKEN ou BASE44_API_KEY (secrets / .env.local).
 */
import { tryFlareClient } from './flare-sdk.mjs';

const gravar = process.argv.includes('--gravar');
const completo = process.argv.includes('--completo');
const somenteVazios = !process.argv.includes('--todos');

function summarize(data) {
  if (!data || typeof data !== 'object') return data;
  const copy = { ...data };
  if (copy.job_cache && typeof copy.job_cache === 'object') {
    const jc = copy.job_cache;
    copy.job_cache = {
      run_id: jc.run_id,
      produto_ids_count: Array.isArray(jc.produto_ids) ? jc.produto_ids.length : 0,
      updates_count: jc.updates ? Object.keys(jc.updates).length : 0,
      total_produtos: jc.total_produtos,
    };
  }
  return copy;
}

async function runStep(log, name, fn) {
  const t0 = Date.now();
  process.stdout.write(`→ ${name}… `);
  try {
    const result = await fn();
    const ms = Date.now() - t0;
    log.push({ step: name, ok: true, ms, result: summarize(result) });
    console.log(`OK (${ms}ms)`);
    return result;
  } catch (error) {
    const ms = Date.now() - t0;
    const message = error?.response?.data?.error || error?.data?.error || error?.message || String(error);
    log.push({ step: name, ok: false, ms, error: message });
    console.log(`FALHOU (${ms}ms)`);
    console.error(`  ${message}`);
    throw error;
  }
}

async function invokeFn(base44, body) {
  const resp = await base44.functions.invoke('atualizarMetasEstoque', body);
  const data = resp?.data ?? resp;
  if (data?.error) {
    const err = new Error(String(data.error));
    err.data = data;
    throw err;
  }
  if (data?.status === 'erro') {
    const err = new Error(String(data.error || 'status erro'));
    err.data = data;
    throw err;
  }
  return data;
}

const base44 = tryFlareClient();
if (!base44) {
  console.error(
    '[debug-metas] Sem credenciais Base44. Defina secrets (VITE_BASE44_APP_ID + token/api_key) ou .env.local',
  );
  process.exit(1);
}

const log = [];

try {
  await runStep(log, 'auth.me', () => base44.auth.me());

  await runStep(log, 'entities.Produto (amostra)', async () => {
    const batch = await base44.entities.Produto.filter({ tipo: 'Produto', ativo: true }, '-created_date', 3, 0);
    return { count: batch?.length ?? 0, ids: (batch || []).map((p) => p.id) };
  });

  const data90d = new Date();
  data90d.setDate(data90d.getDate() - 90);
  await runStep(log, 'entities.PedidoVenda 90d (amostra)', async () => {
    const batch = await base44.entities.PedidoVenda.filter(
      { status: { $ne: 'Cancelado' }, created_date: { $gte: data90d.toISOString() } },
      '-created_date',
      3,
      0,
    );
    return { count: batch?.length ?? 0 };
  });

  const prep = await runStep(log, 'function preparar', () =>
    invokeFn(base44, {
      fase: 'preparar',
      somente_metas_vazias: somenteVazios,
      modo: 'manual',
      batch_size: 50,
    }),
  );

  if (gravar || completo) {
    const jobCache = prep.job_cache;
    if (!jobCache?.run_id) {
      throw new Error('preparar não devolveu job_cache — função no Base44 desatualizada?');
    }

    let offset = 0;
    let bloco = 0;
    do {
      bloco += 1;
      const gravarBody = {
        fase: 'gravar',
        run_id: prep.run_id || jobCache.run_id,
        job_cache: jobCache,
        offset,
        batch_size: completo ? 50 : 1,
        modo: 'manual',
      };
      const blocoRes = await runStep(log, `function gravar bloco ${bloco}`, () =>
        invokeFn(base44, gravarBody),
      );
      if (!completo) break;
      if (blocoRes.concluido) break;
      offset = blocoRes.proximo_offset ?? offset + 50;
    } while (completo);
  }
} catch {
  // log já preenchido
}

console.log('\n--- RELATÓRIO ---');
console.log(JSON.stringify(log, null, 2));

const failed = log.find((s) => !s.ok);
process.exit(failed ? 1 : 0);
