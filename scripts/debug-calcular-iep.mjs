#!/usr/bin/env node
/**
 * Diagnóstico passo a passo do job calcularIEP / curva ABCD (engenharia reversa).
 *
 * Uso:
 *   npm run abcd:debug
 *   npm run abcd:debug -- --gravar    # após preparar, grava 1 bloco
 *   npm run abcd:debug -- --completo  # preparar + todos os blocos
 *   npm run abcd:debug -- --todos     # recalcula todos (não só ABCD vazio)
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
      mapa_grupos_count: jc.mapaAbcdGrupo ? Object.keys(jc.mapaAbcdGrupo).length : 0,
      total_produtos: jc.total_produtos,
      pedidos_90d: jc.pedidos_90d,
      versao: jc.versao,
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
    const message =
      error?.response?.data?.error ||
      error?.data?.error ||
      error?.message ||
      String(error);
    log.push({ step: name, ok: false, ms, error: message });
    console.log(`FALHOU (${ms}ms)`);
    console.error(`  ${message}`);
    throw error;
  }
}

async function invokeFn(base44, body) {
  const resp = await base44.functions.invoke('calcularIEP', body);
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
    '[debug-abcd] Sem credenciais Base44. Defina secrets (VITE_BASE44_APP_ID + token/api_key) ou .env.local',
  );
  process.exit(1);
}

const log = [];

try {
  await runStep(log, 'auth.me', () => base44.auth.me());

  await runStep(log, 'function diagnostico', () => invokeFn(base44, { fase: 'diagnostico', modo: 'manual' }));

  await runStep(log, 'entities.Produto (amostra)', async () => {
    const batch = await base44.entities.Produto.list('-created_date', 3, 0);
    return { count: batch?.length ?? 0, ids: (batch || []).map((p) => p.id) };
  });

  const data90d = new Date();
  data90d.setDate(data90d.getDate() - 90);
  await runStep(log, 'entities.PedidoVenda PDV 90d (amostra)', async () => {
    const batch = await base44.entities.PedidoVenda.filter(
      { tipo: 'PDV', status: { $ne: 'Cancelado' }, created_date: { $gte: data90d.toISOString() } },
      '-created_date',
      3,
      0,
    );
    return { count: batch?.length ?? 0 };
  });

  const prep = await runStep(log, 'function preparar', () =>
    invokeFn(base44, {
      fase: 'preparar',
      somente_abcd_vazio: somenteVazios,
      modo: 'manual',
      batch_size: 50,
    }),
  );

  if (gravar || completo) {
    const jobCache = prep.job_cache;
    if (!jobCache?.run_id || !jobCache?.mapaAbcdGrupo || !jobCache?.produto_ids?.length) {
      throw new Error(
        'preparar incompleto — republica calcularIEP no Base44 (versão V12-abcd-slim-cache ou mais recente)',
      );
    }

    let offset = 0;
    let bloco = 0;
    do {
      bloco += 1;
      const blocoRes = await runStep(log, `function gravar bloco ${bloco}`, () =>
        invokeFn(base44, {
          fase: 'gravar',
          run_id: prep.run_id || jobCache.run_id,
          job_cache: jobCache,
          offset,
          batch_size: completo ? 50 : 1,
          modo: 'manual',
        }),
      );
      if (!completo) break;
      if (blocoRes.concluido) break;
      offset = blocoRes.proximo_offset ?? offset + 50;
    } while (completo);
  }
} catch {
  // log preenchido
}

console.log('\n--- RELATÓRIO ABCD ---');
console.log(JSON.stringify(log, null, 2));

const failed = log.find((s) => !s.ok);
process.exit(failed ? 1 : 0);
