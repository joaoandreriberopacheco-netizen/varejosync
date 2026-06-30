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
// CURVA ABCD — 3 etapas: lista → ordena → classifica (D = restante)
// ═══════════════════════════════════════════════════════════════

function calcularMediasIepPorNivel(produtos, metricasPorSku) {
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

  return { mediaLucroPorChave, mediaNivel1PorH1 };
}

function snapshotProduto(produto) {
  return {
    id: produto.id,
    campo_hierarquico_1: produto.campo_hierarquico_1,
    campo_hierarquico_2: produto.campo_hierarquico_2,
    campo_hierarquico_3: produto.campo_hierarquico_3,
    campo_hierarquico_4: produto.campo_hierarquico_4,
    campo_hierarquico_5: produto.campo_hierarquico_5,
    iep_trava_manual: produto.iep_trava_manual,
    abcd: produto.abcd,
  };
}

/** Etapa 1 — monta a lista: lucro por grupo (nível 2 da descrição), vendas 90d sem outliers. */
function etapa1_listar(produtos, itensPorProduto) {
  const metricasPorSku = {};
  for (const produto of produtos) {
    metricasPorSku[produto.id] = calcularLucroSkuComQ4(produto, itensPorProduto);
  }

  const lucroMax = maxLucroPositivo(metricasPorSku);
  const lucroPorGrupo = {};
  for (const produto of produtos) {
    const key = grupoAbcdKey(produto);
    lucroPorGrupo[key] = (lucroPorGrupo[key] || 0) + (metricasPorSku[produto.id]?.lucro || 0);
  }

  const lista = Object.entries(lucroPorGrupo).map(([id, lucro]) => ({ id, lucro }));
  const { mediaLucroPorChave, mediaNivel1PorH1 } = calcularMediasIepPorNivel(produtos, metricasPorSku);

  const metricas = {};
  for (const [id, m] of Object.entries(metricasPorSku)) {
    metricas[id] = { l: m.lucro, v: m.teveVenda ? 1 : 0 };
  }

  return {
    lista,
    lucroMax,
    metricas,
    mediaLucroPorChave,
    mediaNivel1PorH1,
    grupos_nivel_2: lista.length,
    produtos_snapshot: produtos.map(snapshotProduto),
    total_produtos: produtos.length,
  };
}

/** Etapa 2 — ordena do maior para o menor lucro e calcula participação acumulada. */
function etapa2_ordenarDistribuicao(lista) {
  const ranking = [...lista].sort((a, b) => b.lucro - a.lucro);

  let totalLucroPositivo = 0;
  for (const entry of ranking) {
    if (entry.lucro > 0) totalLucroPositivo += entry.lucro;
  }

  let acumulado = 0;
  const rankingOrdenado = ranking.map((entry) => {
    if (entry.lucro <= 0) {
      return { ...entry, participacao_acumulada_pct: 0 };
    }
    acumulado += entry.lucro;
    const pct = totalLucroPositivo > 0 ? (acumulado / totalLucroPositivo) * 100 : 0;
    return { ...entry, participacao_acumulada_pct: pct };
  });

  return { ranking: rankingOrdenado, totalLucroPositivo };
}

/** Etapa 3 — classifica: A até 70%, B até 85%, C até 95%; o restante (e sem lucro) é D. */
function etapa3_classificarAbcd(ranking, totalLucroPositivo) {
  const mapa = {};
  for (const entry of ranking) {
    mapa[entry.id] = 'D';
  }
  if (totalLucroPositivo <= 0) return mapa;

  for (const entry of ranking) {
    if (entry.lucro <= 0) continue;
    const pct = entry.participacao_acumulada_pct ?? 0;
    if (pct <= 70) mapa[entry.id] = 'A';
    else if (pct <= 85) mapa[entry.id] = 'B';
    else if (pct <= 95) mapa[entry.id] = 'C';
  }
  return mapa;
}

function montarUpdatesProdutos(produtosSnapshot, dadosCalculo, somenteAbcdVazio) {
  const cacheCalc = {
    lucroMax: dadosCalculo.lucroMax,
    mapaAbcdGrupo: dadosCalculo.mapaAbcdGrupo,
    mediaLucroPorChave: dadosCalculo.mediaLucroPorChave,
    mediaNivel1PorH1: dadosCalculo.mediaNivel1PorH1,
    metricas: dadosCalculo.metricas,
  };

  const produtoIds = [];
  const updatesById = {};
  for (const produto of produtosSnapshot) {
    if (somenteAbcdVazio && !produtoAbcdVazio(produto)) continue;
    produtoIds.push(produto.id);
    updatesById[produto.id] = buildUpdateData(produto, cacheCalc);
  }

  return { produto_ids: produtoIds, updates_by_id: updatesById };
}

function pipelineAbcdCompleto(produtos, itensPorProduto, somenteAbcdVazio) {
  const etapa1 = etapa1_listar(produtos, itensPorProduto);
  const etapa2 = etapa2_ordenarDistribuicao(etapa1.lista);
  const mapaAbcdGrupo = etapa3_classificarAbcd(etapa2.ranking, etapa2.totalLucroPositivo);
  const { produto_ids, updates_by_id } = montarUpdatesProdutos(
    etapa1.produtos_snapshot,
    {
      lucroMax: etapa1.lucroMax,
      mapaAbcdGrupo,
      mediaLucroPorChave: etapa1.mediaLucroPorChave,
      mediaNivel1PorH1: etapa1.mediaNivel1PorH1,
      metricas: etapa1.metricas,
    },
    somenteAbcdVazio,
  );

  return {
    lucroMax: etapa1.lucroMax,
    grupos_nivel_2: etapa1.grupos_nivel_2,
    total_produtos: etapa1.total_produtos,
    ranking: etapa2.ranking,
    totalLucroPositivo: etapa2.totalLucroPositivo,
    mapaAbcdGrupo,
    produto_ids,
    updates_by_id,
    etapa: 'classificar',
  };
}

function maxLucroPositivo(metricasPorSku) {
  let max = 0;
  for (const m of Object.values(metricasPorSku)) {
    const v = Math.max(0, m?.lucro ?? 0);
    if (v > max) max = v;
  }
  return max;
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
  if (clientCache?.run_id) {
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
// FASES DO JOB — listar → classificar → gravar
// ═══════════════════════════════════════════════════════════════

async function carregarDados90d(db) {
  const hoje = new Date();
  const data90d = new Date();
  data90d.setDate(hoje.getDate() - 90);
  const dataISO = data90d.toISOString();
  const [produtos, todosPedidos] = await Promise.all([
    fetchProdutosComPaginacao(db),
    fetchPedidosComPaginacao(db, dataISO),
  ]);
  return { produtos, todosPedidos, dataISO };
}

async function persistirCacheJob(db, cache) {
  let cacheNoServidor = false;
  try {
    await saveJobCache(db, cache);
    cacheNoServidor = true;
  } catch {
    // cliente pode receber job_cache na resposta
  }
  return cacheNoServidor;
}

async function runListar(db, body, modo, somenteAbcdVazio, batchSize) {
  const { produtos, todosPedidos } = await carregarDados90d(db);

  if (somenteAbcdVazio && produtos.filter(produtoAbcdVazio).length === 0) {
    await clearJobCache(db);
    return {
      status: 'sem_alteracao',
      fase: 'listar',
      etapa: 'listar',
      mensagem: 'Nenhum produto com ABCD vazio no cadastro.',
      modo,
      somente_abcd_vazio: true,
      concluido: true,
      total_produtos: produtos.length,
    };
  }

  const itensPorProduto = buildItensPorProdutoId(todosPedidos);
  const etapa1 = etapa1_listar(produtos, itensPorProduto);
  const etapa2 = etapa2_ordenarDistribuicao(etapa1.lista);
  const runId = String(body.run_id || newRunId());

  const cache = {
    run_id: runId,
    created_at: new Date().toISOString(),
    modo,
    somente_abcd_vazio: somenteAbcdVazio,
    batch_size: batchSize,
    etapa: 'listar',
    lucroMax: etapa1.lucroMax,
    metricas: etapa1.metricas,
    mediaLucroPorChave: etapa1.mediaLucroPorChave,
    mediaNivel1PorH1: etapa1.mediaNivel1PorH1,
    produtos_snapshot: etapa1.produtos_snapshot,
    ranking: etapa2.ranking,
    totalLucroPositivo: etapa2.totalLucroPositivo,
    grupos_nivel_2: etapa1.grupos_nivel_2,
    total_produtos: etapa1.total_produtos,
    pedidos_90d: todosPedidos.length,
  };

  const cacheNoServidor = await persistirCacheJob(db, cache);

  return {
    status: 'listado',
    fase: 'listar',
    etapa: 'listar',
    run_id: runId,
    job_cache: cacheNoServidor ? undefined : cache,
    cache_no_servidor: cacheNoServidor,
    modo,
    somente_abcd_vazio: somenteAbcdVazio,
    total_produtos: etapa1.total_produtos,
    grupos_nivel_2: etapa1.grupos_nivel_2,
    pedidos_90d: todosPedidos.length,
    proxima_fase: 'classificar',
  };
}

async function runClassificar(db, body) {
  const { cache, source } = await resolveJobCache(db, body);
  if (!cache?.run_id) {
    return { status: 'erro', fase: 'classificar', error: 'Execute a etapa listar primeiro.' };
  }
  if (body.run_id && String(body.run_id) !== String(cache.run_id)) {
    return { status: 'erro', fase: 'classificar', error: 'run_id inválido. Execute listar novamente.' };
  }
  if (!cache.ranking || !cache.produtos_snapshot) {
    return { status: 'erro', fase: 'classificar', error: 'Cache incompleto. Execute listar novamente.' };
  }

  const mapaAbcdGrupo = etapa3_classificarAbcd(cache.ranking, cache.totalLucroPositivo ?? 0);
  const { produto_ids, updates_by_id } = montarUpdatesProdutos(
    cache.produtos_snapshot,
    {
      lucroMax: cache.lucroMax,
      mapaAbcdGrupo,
      mediaLucroPorChave: cache.mediaLucroPorChave,
      mediaNivel1PorH1: cache.mediaNivel1PorH1,
      metricas: cache.metricas,
    },
    Boolean(cache.somente_abcd_vazio),
  );

  const batchSize = cache.batch_size || DEFAULT_BATCH_SIZE;
  const cacheCompleto = {
    ...cache,
    etapa: 'classificar',
    mapaAbcdGrupo,
    produto_ids,
    updates_by_id,
  };

  const cacheNoServidor = await persistirCacheJob(db, cacheCompleto);

  const totalPendentes = produto_ids.length;
  const totalBlocos = totalPendentes > 0 ? Math.ceil(totalPendentes / batchSize) : 0;

  return {
    status: 'classificado',
    fase: 'classificar',
    etapa: 'classificar',
    run_id: cache.run_id,
    job_cache: cacheNoServidor ? undefined : cacheCompleto,
    cache_no_servidor: cacheNoServidor,
    modo: cache.modo,
    somente_abcd_vazio: cache.somente_abcd_vazio,
    total_produtos: cache.total_produtos,
    total_pendentes: totalPendentes,
    grupos_nivel_2: cache.grupos_nivel_2,
    batch_size: batchSize,
    total_blocos: totalBlocos,
    proximo_offset: 0,
    concluido: totalPendentes === 0,
    proxima_fase: 'gravar',
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

async function gravarBloco(db, cache, offset, batchSize) {
  const ids = cache.produto_ids.slice(offset, offset + batchSize);
  if (!ids.length) {
    return { atualizados: 0, concluido: true, proximo_offset: offset };
  }

  const updates = [];
  for (const id of ids) {
    const data = cache.updates_by_id?.[id];
    if (data) updates.push({ id, data });
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
    pareto: '70/15/10/5 lucro acumulado (A até 70%, B até 85%, C até 95%, D restante)',
    iqr: 'por_sku_exclui_q4',
    nivel_1: 'media_dos_filhos_nivel_2',
    somente_abcd_vazio: somenteAbcdVazio,
    batch_size: DEFAULT_BATCH_SIZE,
  };
}

async function runPreparar(db, body, modo, somenteAbcdVazio, batchSize) {
  const listado = await runListar(db, body, modo, somenteAbcdVazio, batchSize);
  if (listado.status === 'sem_alteracao' || listado.concluido) {
    return { ...listado, fase: 'preparar' };
  }

  const classificado = await runClassificar(db, {
    ...body,
    run_id: listado.run_id,
    ...(listado.job_cache ? { job_cache: listado.job_cache } : {}),
  });

  if (classificado.status === 'erro') {
    return { ...classificado, fase: 'preparar' };
  }

  return {
    ...classificado,
    status: 'preparado',
    fase: 'preparar',
    pedidos_90d: listado.pedidos_90d,
  };
}

async function runGravar(db, body, batchSize) {
  const { cache, source } = await resolveJobCache(db, body);
  if (!cache?.run_id) {
    return {
      status: 'erro',
      fase: 'gravar',
      error: 'Nenhum job classificado. Execute listar e classificar primeiro.',
    };
  }

  if (!cache.updates_by_id || !cache.produto_ids) {
    return {
      status: 'erro',
      fase: 'gravar',
      error: 'Classificação pendente. Execute a fase classificar antes de gravar.',
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
    versao: 'V9-abcd-etapas',
    regras: regrasResposta(cache.somente_abcd_vazio),
    timestamp: new Date().toISOString(),
  };
}

async function runGravarTodosBlocos(db, body, batchSize) {
  const listado = await runListar(
    db,
    body,
    body.modo || 'agendado',
    body.somente_abcd_vazio != null ? Boolean(body.somente_abcd_vazio) : false,
    batchSize,
  );

  if (listado.status === 'sem_alteracao' || listado.concluido) {
    return {
      ...listado,
      versao: 'V9-abcd-etapas',
      regras: regrasResposta(Boolean(body.somente_abcd_vazio)),
      timestamp: new Date().toISOString(),
    };
  }

  const classificado = await runClassificar(db, {
    ...body,
    run_id: listado.run_id,
    ...(listado.job_cache ? { job_cache: listado.job_cache } : {}),
  });

  if (classificado.status === 'erro') {
    return classificado;
  }

  let offset = 0;
  let totalAtualizados = 0;
  let ultimoBloco = null;
  const jobCache = classificado.job_cache;

  while (true) {
    ultimoBloco = await runGravar(
      db,
      {
        ...body,
        offset,
        run_id: classificado.run_id,
        batch_size: batchSize,
        ...(jobCache ? { job_cache: jobCache } : {}),
      },
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
    modo: classificado.modo,
    somente_abcd_vazio: classificado.somente_abcd_vazio,
    atualizados: totalAtualizados,
    processados: totalAtualizados,
    total_produtos: classificado.total_produtos,
    total_pendentes: classificado.total_pendentes,
    grupos_nivel_2: classificado.grupos_nivel_2,
    total_blocos: classificado.total_blocos,
    batch_size: batchSize,
    versao: 'V9-abcd-etapas',
    regras: regrasResposta(classificado.somente_abcd_vazio),
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

    if (fase === 'listar') {
      const listado = await runListar(db, body, modo, somenteAbcdVazio, batchSize);
      return Response.json({
        ...listado,
        versao: 'V9-abcd-etapas',
        regras: regrasResposta(somenteAbcdVazio),
        timestamp: new Date().toISOString(),
      });
    }

    if (fase === 'classificar') {
      const classificado = await runClassificar(db, body);
      return Response.json({
        ...classificado,
        versao: 'V9-abcd-etapas',
        regras: regrasResposta(classificado.somente_abcd_vazio ?? somenteAbcdVazio),
        timestamp: new Date().toISOString(),
      });
    }

    if (fase === 'preparar') {
      const prep = await runPreparar(db, body, modo, somenteAbcdVazio, batchSize);
      return Response.json({
        ...prep,
        versao: 'V9-abcd-etapas',
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
      versao: 'V9-abcd-etapas',
      regras: regrasResposta(somenteAbcdVazio),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error?.message || String(error);
    console.error('[calcularIEP]', message, error?.stack);
    return Response.json(
      { error: message, fase: 'erro', status: 'erro' },
      { status: 500 },
    );
  }
});
