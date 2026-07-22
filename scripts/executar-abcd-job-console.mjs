#!/usr/bin/env node
/**
 * Imprime script para colar no console do browser em https://p38.base44.app (admin logado).
 * Executa o job ABCDE completo (listar → classificar → gravar em blocos).
 *
 * Uso: npm run abcd:executar-console
 */
const BATCH_SIZE = 50;

console.log(`
// Cole no console do p38.base44.app (F12 → Console), com sessão ADMIN:
(async () => {
  const appId = localStorage.getItem('app_id');
  const token = localStorage.getItem('base44_access_token');
  if (!appId || !token) { console.error('Faça login no P38 primeiro.'); return; }

  const somenteVazios = confirm(
    'Atualizar curva ABCDE no cadastro?\\n\\nOK = só produtos com ABCD vazio\\nCancelar = recalcular TODOS os produtos'
  );

  const { createClient } = await import('https://esm.sh/@base44/sdk@0.8.40');
  const base44 = createClient({ appId, serverUrl: 'https://p38.base44.app', token, requiresAuth: true });

  function unwrap(resp) {
    const data = resp?.data ?? resp;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return { mensagem: data }; }
    }
    return data && typeof data === 'object' ? data : {};
  }

  console.log('Etapa 1/4 — listar vendas 90d e montar grupos…');
  const listado = unwrap(await base44.functions.invoke('calcularIEP', {
    fase: 'listar',
    somente_abcd_vazio: somenteVazios,
    modo: 'manual',
    batch_size: ${BATCH_SIZE},
  }));

  if (listado.error || listado.status === 'erro') {
    console.error('Falha na listagem:', listado);
    return;
  }
  if (listado.status === 'sem_alteracao' || listado.concluido) {
    console.log('Nada a fazer:', listado.mensagem || listado);
    return;
  }

  console.log('Etapa 2–3/4 — classificar A/B/C/D/E…', listado);
  const classificado = unwrap(await base44.functions.invoke('calcularIEP', {
    fase: 'classificar',
    run_id: listado.run_id,
    ...(listado.job_cache ? { job_cache: listado.job_cache } : {}),
    modo: 'manual',
  }));

  if (classificado.error || classificado.status === 'erro') {
    console.error('Falha na classificação:', classificado);
    return;
  }

  const jobCache = classificado.job_cache;
  const cacheNoServidor = Boolean(classificado.cache_no_servidor);
  const runId = classificado.run_id || jobCache?.run_id;
  const totalPendentes = classificado.total_pendentes ?? jobCache?.produto_ids?.length ?? 0;

  if (!totalPendentes) {
    console.log('Nenhum produto para gravar.');
    return;
  }

  console.log('Etapa 4/4 — gravar', totalPendentes, 'produtos em blocos de ${BATCH_SIZE}…');
  let offset = 0;
  let totalAtualizados = 0;
  let bloco = 0;

  while (offset < totalPendentes) {
    bloco += 1;
    const gravado = unwrap(await base44.functions.invoke('calcularIEP', {
      fase: 'gravar',
      run_id: runId,
      ...(cacheNoServidor ? {} : { job_cache: jobCache }),
      offset,
      batch_size: ${BATCH_SIZE},
      modo: 'manual',
    }));

    if (gravado.error || gravado.status === 'erro') {
      console.error('Falha no bloco', bloco, gravado);
      return;
    }

    totalAtualizados += gravado.atualizados ?? 0;
    offset = gravado.proximo_offset ?? offset + ${BATCH_SIZE};
    console.log('Bloco', bloco, '—', totalAtualizados, '/', totalPendentes, 'versão', gravado.versao || classificado.versao);

    if (gravado.concluido) break;
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log('✅ Concluído —', totalAtualizados, 'produtos atualizados com curva ABCDE.');
  console.log('Recarregue o catálogo para ver as classes (incluindo E = sem venda).');
})();
`);
