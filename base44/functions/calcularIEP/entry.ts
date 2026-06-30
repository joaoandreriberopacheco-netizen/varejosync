import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// QUARTIS — desconsidera o 4.º quartil (valores acima de Q3)
// ═══════════════════════════════════════════════════════════════

const DEFAULT_BATCH_SIZE = 50;
const UPDATE_CONCURRENCY = 5;
const CACHE_KEY = 'iep_job_run';

/** Q3 — limite superior do miolo (exclui 4.º quartil). */
function q3(values) {
  if (!values || values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = Math.ceil(sorted.length * 0.75) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function average(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function hierarchyKey(parts) {
  return parts.filter(Boolean).join('\x00');
}

function resolveCustoCalculado(produto) {
  const salvo = Number(produto?.preco_custo_calculado) || 0;
  if (salvo > 0) return salvo;
  return (
    (Number(produto?.valor_compra) || 0) +
    (Number(produto?.custo_frete_padrao) || 0) +
    (Number(produto?.custo_imposto1_padrao) || 0) +
    (Number(produto?.custo_imposto2_padrao) || 0) +
    (Number(produto?.custo_outros_padrao) || 0) -
    (Number(produto?.desconto_compra_padrao) || 0)
  );
}

function lineQuantityBase(item) {
  const qtyBase = item?.quantidade_base;
  if (qtyBase != null && Number.isFinite(Number(qtyBase))) {
    return Number(qtyBase) || 0;
  }
  const qty = Number(item?.quantidade) || 0;
  const fator = Number(item?.fator_conversao) || 1;
  return qty * fator;
}

/** ABCD no nível 2 da descrição (h1+h2); se só h1, no nível 1. */
function grupoAbcdKey(produto) {
  const h1 = (produto.campo_hierarquico_1 || 'unassigned').trim();
  const h2 = (produto.campo_hierarquico_2 || '').trim();
  if (h2) return hierarchyKey([h1, h2]);
  return hierarchyKey([h1]);
}

function buildItensPorProdutoId(pedidos90d) {
  const map = {};
  for (const pedido of pedidos90d || []) {
    for (const it of pedido.itens || []) {
      const pid = String(it?.produto_id ?? '');
      if (!pid) continue;
      if (!map[pid]) map[pid] = [];
      map[pid].push(it);
    }
  }
  return map;
}

function calcularLucroSkuComQ4(produto, itensPorProduto) {
  const custoUnit = resolveCustoCalculado(produto);
  const pid = String(produto.id ?? '');
  const itens = itensPorProduto[pid] || [];

  if (itens.length === 0) {
    return { lucro: 0, precoMedio: 0, quantidade: 0, teveVenda: false };
  }

  const linhas = itens
    .map((it) => {
      const qtyBase = lineQuantityBase(it);
      const total = Number(it.total) || 0;
      const unitPrice = qtyBase > 0 ? total / qtyBase : 0;
      return { unitPrice, qtyBase, total };
    })
    .filter((l) => l.qtyBase > 0 && l.total > 0);

  if (linhas.length === 0) {
    return { lucro: 0, precoMedio: 0, quantidade: 0, teveVenda: false };
  }

  const unitPrices = linhas.map((l) => l.unitPrice);
  const limiteQ3 = q3(unitPrices);
  const linhasCore =
    linhas.length < 4 ? linhas : linhas.filter((l) => l.unitPrice <= limiteQ3);

  const quantidade = linhasCore.reduce((acc, l) => acc + l.qtyBase, 0);
  const receita = linhasCore.reduce((acc, l) => acc + l.total, 0);
  const precoMedio = quantidade > 0 ? receita / quantidade : 0;
  const lucro = receita - custoUnit * quantidade;

  return { lucro, precoMedio, quantidade, teveVenda: quantidade > 0 };
}

// ═══════════════════════════════════════════════════════════════
// CURVA ABCD — Pareto 70 / 15 / 10 / 5 por lucro agregado
// ═══════════════════════════════════════════════════════════════

function classificarParetoABCD(ranking, totalLucroPositivo) {
  const mapa = {};
  if (totalLucroPositivo <= 0) {
    ranking.forEach((entry) => { mapa[entry.id] = 'D'; });
    return mapa;
  }
  const comLucro = ranking.filter((entry) => entry.lucro > 0);
  let acumulado = 0;
  comLucro.forEach((entry) => {
    acumulado += entry.lucro;
    const percentual = (acumulado / totalLucroPositivo) * 100;
    if (percentual <= 70) mapa[entry.id] = 'A';
    else if (percentual <= 85) mapa[entry.id] = 'B';
    else if (percentual <= 95) mapa[entry.id] = 'C';
    else mapa[entry.id] = 'D';
  });
  ranking.filter((entry) => entry.lucro <= 0).forEach((entry) => { mapa[entry.id] = 'D'; });
  return mapa;
}

function normalizarScore0a100(lucro, lucroMax, teveVenda) {
  if (!teveVenda) return 0;
  if (lucroMax <= 0) return lucro > 0 ? 50 : 1;
  return Math.round(Math.max(1, Math.min(100, (Math.max(0, lucro) / lucroMax) * 100)));
}

function produtoAbcdVazio(produto) {
  return !String(produto?.abcd ?? '').trim();
}

async function parseRequestBody(req) {
  try {
    const raw = await req.text();
    if (!raw?.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function newRunId() {
  return `iep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════
// FETCH COM PAGINAÇÃO
// ═══════════════════════════════════════════════════════════════

async function fetchPedidosComPaginacao(entities, dataISO, pageSize = 500) {
  const todosPedidos = [];
  let skip = 0;
  let temMais = true;

  while (temMais) {
    const batch = await entities.PedidoVenda.filter(
      { tipo: 'PDV', status: { $ne: 'Cancelado' }, created_date: { $gte: dataISO } },
      '-created_date',
      pageSize,
      skip
    );

    if (!batch || batch.length === 0) {
      temMais = false;
    } else {
      todosPedidos.push(...batch);
      skip += pageSize;
      if (batch.length < pageSize) temMais = false;
    }
  }

  return todosPedidos;
}

async function fetchProdutosComPaginacao(entities, pageSize = 500) {
  const todos = [];
  let skip = 0;
  let temMais = true;

  while (temMais) {
    const batch = await entities.Produto.list('-created_date', pageSize, skip);
    if (!batch || batch.length === 0) {
      temMais = false;
    } else {
      todos.push(...batch);
      skip += pageSize;
      if (batch.length < pageSize) temMais = false;
    }
  }

  return todos;
}

// ═══════════════════════════════════════════════════════════════
// CACHE DO JOB (ConfiguracoesVenda.iep_job_run)
// ═══════════════════════════════════════════════════════════════

async function loadJobCache(db) {
  const configs = await db.ConfiguracoesVenda.list();
  return configs?.[0]?.[CACHE_KEY] ?? null;
}

async function resolveJobCache(db, body) {
  const clientCache = body?.job_cache;
  if (clientCache?.run_id && Array.isArray(clientCache.produto_ids)) {
    return { cache: clientCache, source: 'client' };
  }
  const serverCache = await loadJobCache(db);
  return { cache: serverCache, source: 'server' };
}

async function saveJobCache(db, cache) {
  const configs = await db.ConfiguracoesVenda.list();
  if (configs?.[0]?.id) {
    await db.ConfiguracoesVenda.update(configs[0].id, { [CACHE_KEY]: cache });
    return;
  }
  await db.ConfiguracoesVenda.create({
    fluxo_venda_padrao: 'completo',
    exibir_estoque_pdv: true,
    vender_sem_estoque: false,
    bloquear_venda_preco_zero: true,
    casas_decimais_quantidade: 0,
    [CACHE_KEY]: cache,
  });
}

async function clearJobCache(db) {
  const configs = await db.ConfiguracoesVenda.list();
  if (configs?.[0]?.id) {
    await db.ConfiguracoesVenda.update(configs[0].id, { [CACHE_KEY]: null });
  }
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULO GLOBAL (fase preparar)
// ═══════════════════════════════════════════════════════════════

function computeSnapshot(produtos, itensPorProduto, somenteAbcdVazio) {
  const metricasPorSku = {};
  for (const produto of produtos) {
    metricasPorSku[produto.id] = calcularLucroSkuComQ4(produto, itensPorProduto);
  }

  const lucroMax = Math.max(0, ...Object.values(metricasPorSku).map((m) => Math.max(0, m.lucro)));

  const lucroPorGrupo = {};
  for (const produto of produtos) {
    const key = grupoAbcdKey(produto);
    lucroPorGrupo[key] = (lucroPorGrupo[key] || 0) + (metricasPorSku[produto.id]?.lucro || 0);
  }

  const rankingGrupos = Object.entries(lucroPorGrupo)
    .map(([id, lucro]) => ({ id, lucro }))
    .sort((a, b) => b.lucro - a.lucro);

  const lucroTotalPositivo = rankingGrupos.reduce((acc, g) => acc + Math.max(0, g.lucro), 0);
  const mapaAbcdGrupo = classificarParetoABCD(rankingGrupos, lucroTotalPositivo);

  const skusPorChaveNivel = (nivel) => {
    const map = {};
    for (const produto of produtos) {
      const parts = [
        produto.campo_hierarquico_1,
        produto.campo_hierarquico_2,
        produto.campo_hierarquico_3,
        produto.campo_hierarquico_4,
        produto.campo_hierarquico_5,
      ].slice(0, nivel);
      if (parts.filter(Boolean).length < nivel) continue;
      const key = hierarchyKey(parts);
      if (!map[key]) map[key] = [];
      map[key].push(produto.id);
    }
    return map;
  };

  const mediaLucroPorChave = {};
  for (let nivel = 2; nivel <= 5; nivel += 1) {
    const grupos = skusPorChaveNivel(nivel);
    for (const [key, skuIds] of Object.entries(grupos)) {
      const lucros = skuIds.map((id) => metricasPorSku[id]?.lucro ?? 0);
      mediaLucroPorChave[`n${nivel}:${key}`] = average(lucros);
    }
  }

  const mediaNivel2PorH1 = {};
  for (const [key, media] of Object.entries(mediaLucroPorChave)) {
    if (!key.startsWith('n2:')) continue;
    const h1 = key.slice(3).split('\x00')[0];
    if (!h1) continue;
    if (!mediaNivel2PorH1[h1]) mediaNivel2PorH1[h1] = [];
    mediaNivel2PorH1[h1].push(media);
  }
  const mediaNivel1PorH1 = {};
  for (const [h1, medias] of Object.entries(mediaNivel2PorH1)) {
    mediaNivel1PorH1[h1] = average(medias);
  }

  const produtoIds = [];
  for (const produto of produtos) {
    if (somenteAbcdVazio && !produtoAbcdVazio(produto)) continue;
    produtoIds.push(produto.id);
  }

  const metricasCompact = {};
  for (const [id, m] of Object.entries(metricasPorSku)) {
    metricasCompact[id] = { l: m.lucro, v: m.teveVenda ? 1 : 0 };
  }

  return {
    lucroMax,
    mapaAbcdGrupo,
    mediaLucroPorChave,
    mediaNivel1PorH1,
    grupos_nivel_2: Object.keys(lucroPorGrupo).length,
    produto_ids: produtoIds,
    metricas: metricasCompact,
    total_produtos: produtos.length,
  };
}

function rollupNivel(produto, nivel, mediaLucroPorChave) {
  const parts = [
    produto.campo_hierarquico_1,
    produto.campo_hierarquico_2,
    produto.campo_hierarquico_3,
    produto.campo_hierarquico_4,
    produto.campo_hierarquico_5,
  ].slice(0, nivel);
  if (parts.filter(Boolean).length < nivel) return 0;
  const key = `n${nivel}:${hierarchyKey(parts)}`;
  return Math.round(mediaLucroPorChave[key] || 0);
}

function buildUpdateData(produto, cache) {
  const sku = cache.metricas[produto.id] || { l: 0, v: 0 };
  const lucro = sku.l;
  const teveVenda = sku.v === 1;
  const h1 = produto.campo_hierarquico_1 || 'unassigned';
  const grupoKey = grupoAbcdKey(produto);
  const classe = cache.mapaAbcdGrupo[grupoKey] || 'D';
  const trava = produto.iep_trava_manual || false;

  const updateData = {
    abcd: classe,
    iep_score: normalizarScore0a100(lucro, cache.lucroMax, teveVenda),
    iep_score_nivel_1: Math.round(cache.mediaNivel1PorH1[h1] || 0),
    iep_score_nivel_2: rollupNivel(produto, 2, cache.mediaLucroPorChave),
    iep_score_nivel_3: rollupNivel(produto, 3, cache.mediaLucroPorChave),
    iep_score_nivel_4: rollupNivel(produto, 4, cache.mediaLucroPorChave),
    iep_score_nivel_5: rollupNivel(produto, 5, cache.mediaLucroPorChave),
  };

  if (!trava) {
    updateData.iep_classe = classe;
  }

  return updateData;
}

async function fetchProdutosPorIds(db, ids) {
  if (!ids.length) return [];
  try {
    const batch = await db.Produto.list(null, ids.length, { id: { $in: ids } });
    if (batch?.length) return batch;
  } catch {
    // fallback abaixo
  }
  const map = new Map();
  for (const id of ids) {
    const rows = await db.Produto.filter({ id }, null, 1);
    if (rows?.[0]) map.set(rows[0].id, rows[0]);
  }
  return ids.map((id) => map.get(id)).filter(Boolean);
}

async function gravarBloco(db, cache, offset, batchSize) {
  const ids = cache.produto_ids.slice(offset, offset + batchSize);
  if (!ids.length) {
    return { atualizados: 0, concluido: true, proximo_offset: offset };
  }

  const produtos = await fetchProdutosPorIds(db, ids);
  const byId = new Map(produtos.map((p) => [p.id, p]));
  const updates = [];

  for (const id of ids) {
    const produto = byId.get(id);
    if (!produto) continue;
    updates.push({ id, data: buildUpdateData(produto, cache) });
  }

  for (let i = 0; i < updates.length; i += UPDATE_CONCURRENCY) {
    const chunk = updates.slice(i, i + UPDATE_CONCURRENCY);
    await Promise.all(chunk.map(({ id, data }) => db.Produto.update(id, data)));
  }

  const proximo_offset = offset + ids.length;
  const concluido = proximo_offset >= cache.produto_ids.length;

  return {
    atualizados: updates.length,
    concluido,
    proximo_offset,
  };
}

function regrasResposta(somenteAbcdVazio) {
  return {
    janela_dias: 90,
    custo: 'preco_custo_calculado',
    preco: 'media_venda_sem_4_quartil_por_sku',
    abcd_nivel: 'campo_hierarquico_2 (ou campo_hierarquico_1 se h2 vazio)',
    pareto: '70/15/10/5',
    iqr: 'por_sku_exclui_q4',
    nivel_1: 'media_dos_filhos_nivel_2',
    somente_abcd_vazio: somenteAbcdVazio,
    batch_size: DEFAULT_BATCH_SIZE,
  };
}

async function runPreparar(db, body, modo, somenteAbcdVazio, batchSize) {
  const hoje = new Date();
  const data90d = new Date();
  data90d.setDate(hoje.getDate() - 90);
  const dataISO = data90d.toISOString();

  const [produtos, todosPedidos] = await Promise.all([
    fetchProdutosComPaginacao(db),
    fetchPedidosComPaginacao(db, dataISO),
  ]);

  if (somenteAbcdVazio) {
    const vazios = produtos.filter(produtoAbcdVazio);
    if (vazios.length === 0) {
      await clearJobCache(db);
      return {
        status: 'sem_alteracao',
        fase: 'preparar',
        mensagem: 'Nenhum produto com ABCD vazio no cadastro.',
        modo,
        somente_abcd_vazio: true,
        atualizados: 0,
        total_produtos: produtos.length,
        concluido: true,
      };
    }
  }

  const itensPorProduto = buildItensPorProdutoId(todosPedidos);
  const snapshot = computeSnapshot(produtos, itensPorProduto, somenteAbcdVazio);
  const runId = String(body.run_id || newRunId());

  const cache = {
    run_id: runId,
    created_at: new Date().toISOString(),
    modo,
    somente_abcd_vazio: somenteAbcdVazio,
    batch_size: batchSize,
    ...snapshot,
  };

  try {
    await saveJobCache(db, cache);
  } catch {
    // Se o campo não existir na entidade, o cliente usa job_cache da resposta.
  }

  const totalPendentes = snapshot.produto_ids.length;
  const totalBlocos = totalPendentes > 0 ? Math.ceil(totalPendentes / batchSize) : 0;

  return {
    status: 'preparado',
    fase: 'preparar',
    run_id: runId,
    job_cache: cache,
    modo,
    somente_abcd_vazio: somenteAbcdVazio,
    total_produtos: snapshot.total_produtos,
    total_pendentes: totalPendentes,
    grupos_nivel_2: snapshot.grupos_nivel_2,
    batch_size: batchSize,
    total_blocos: totalBlocos,
    proximo_offset: 0,
    concluido: totalPendentes === 0,
    pedidos_90d: todosPedidos.length,
  };
}

async function runGravar(db, body, batchSize) {
  const { cache, source } = await resolveJobCache(db, body);
  if (!cache?.run_id) {
    return {
      status: 'erro',
      fase: 'gravar',
      error: 'Nenhum job preparado. Execute a fase preparar primeiro.',
    };
  }

  if (body.run_id && String(body.run_id) !== String(cache.run_id)) {
    return {
      status: 'erro',
      fase: 'gravar',
      error: 'run_id não corresponde ao job em andamento. Execute preparar novamente.',
    };
  }

  const offset = Math.max(0, Number(body.offset) || 0);
  const size = Math.min(Math.max(10, Number(body.batch_size) || cache.batch_size || batchSize), 120);
  const totalPendentes = cache.produto_ids?.length || 0;

  if (totalPendentes === 0) {
    if (source === 'server') await clearJobCache(db);
    return {
      status: 'sem_alteracao',
      fase: 'gravar',
      concluido: true,
      atualizados: 0,
      total_pendentes: 0,
      run_id: cache.run_id,
    };
  }

  const bloco = await gravarBloco(db, cache, offset, size);
  const atualizadosAcumulado = bloco.proximo_offset;
  const totalBlocos = Math.ceil(totalPendentes / size);

  if (bloco.concluido && source === 'server') {
    await clearJobCache(db);
  }

  return {
    status: bloco.concluido ? 'sucesso' : 'em_andamento',
    fase: 'gravar',
    run_id: cache.run_id,
    modo: cache.modo,
    somente_abcd_vazio: cache.somente_abcd_vazio,
    batch_size: size,
    offset,
    proximo_offset: bloco.proximo_offset,
    bloco_atual: Math.min(Math.floor(offset / size) + 1, totalBlocos),
    total_blocos: totalBlocos,
    atualizados: bloco.atualizados,
    atualizados_acumulado: atualizadosAcumulado,
    total_pendentes: totalPendentes,
    total_produtos: cache.total_produtos,
    grupos_nivel_2: cache.grupos_nivel_2,
    concluido: bloco.concluido,
    versao: 'V8-abcd-iqr-nivel2-blocos',
    regras: regrasResposta(cache.somente_abcd_vazio),
    timestamp: new Date().toISOString(),
  };
}

async function runGravarTodosBlocos(db, body, batchSize) {
  const prep = await runPreparar(db, body, body.modo || 'agendado', body.somente_abcd_vazio != null ? Boolean(body.somente_abcd_vazio) : false, batchSize);

  if (prep.status === 'sem_alteracao' || prep.concluido) {
    return {
      ...prep,
      versao: 'V8-abcd-iqr-nivel2-blocos',
      regras: regrasResposta(Boolean(body.somente_abcd_vazio)),
      timestamp: new Date().toISOString(),
    };
  }

  let offset = 0;
  let totalAtualizados = 0;
  let ultimoBloco = null;
  const jobCache = prep.job_cache;

  while (true) {
    ultimoBloco = await runGravar(
      db,
      { ...body, offset, run_id: prep.run_id, batch_size: batchSize, job_cache: jobCache },
      batchSize,
    );
    if (ultimoBloco.status === 'erro') {
      return ultimoBloco;
    }
    totalAtualizados += ultimoBloco.atualizados || 0;
    if (ultimoBloco.concluido) break;
    offset = ultimoBloco.proximo_offset;
  }

  return {
    status: 'sucesso',
    fase: 'completo',
    modo: prep.modo,
    somente_abcd_vazio: prep.somente_abcd_vazio,
    atualizados: totalAtualizados,
    processados: totalAtualizados,
    total_produtos: prep.total_produtos,
    total_pendentes: prep.total_pendentes,
    grupos_nivel_2: prep.grupos_nivel_2,
    total_blocos: prep.total_blocos,
    batch_size: batchSize,
    versao: 'V8-abcd-iqr-nivel2-blocos',
    regras: regrasResposta(prep.somente_abcd_vazio),
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// JOB PRINCIPAL — IQR por SKU + ABCD no nível hierárquico 2
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let isAutomation = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    } catch {
      isAutomation = true;
    }

    const body = await parseRequestBody(req);
    const modo = String(body.modo || (isAutomation ? 'agendado' : 'manual'));
    const somenteAbcdVazio =
      body.somente_abcd_vazio != null
        ? Boolean(body.somente_abcd_vazio)
        : false;
    const batchSize = Math.min(Math.max(10, Number(body.batch_size) || DEFAULT_BATCH_SIZE), 120);
    const fase = String(body.fase || '').toLowerCase();

    const db = isAutomation ? base44.asServiceRole.entities : base44.entities;

    if (fase === 'limpar') {
      await clearJobCache(db);
      return Response.json({ status: 'ok', fase: 'limpar', mensagem: 'Cache do job removido.' });
    }

    if (fase === 'preparar') {
      const prep = await runPreparar(db, body, modo, somenteAbcdVazio, batchSize);
      return Response.json({
        ...prep,
        versao: 'V8-abcd-iqr-nivel2-blocos',
        regras: regrasResposta(somenteAbcdVazio),
        timestamp: new Date().toISOString(),
      });
    }

    if (fase === 'gravar') {
      const gravar = await runGravar(db, body, batchSize);
      return Response.json(gravar);
    }

    // Agendado ou chamada legada: prepara + grava todos os blocos na mesma execução
    if (modo === 'agendado' || !fase) {
      const result = await runGravarTodosBlocos(db, { ...body, modo, somente_abcd_vazio: somenteAbcdVazio }, batchSize);
      return Response.json(result);
    }

    // Manual sem fase explícita: só prepara (UI deve chamar gravar em loop)
    const prep = await runPreparar(db, body, modo, somenteAbcdVazio, batchSize);
    return Response.json({
      ...prep,
      versao: 'V8-abcd-iqr-nivel2-blocos',
      regras: regrasResposta(somenteAbcdVazio),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
