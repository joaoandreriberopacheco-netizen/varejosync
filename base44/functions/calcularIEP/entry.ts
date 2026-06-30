import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// QUARTIS — desconsidera o 4.º quartil (valores acima de Q3)
// ═══════════════════════════════════════════════════════════════

const DEFAULT_BATCH_SIZE = 50;
const UPDATE_CONCURRENCY = 5;
const CACHE_KEY = 'iep_job_run';
const VERSAO = 'V12-abcd-slim-cache';

/** Q3 — limite superior do miolo (exclui 4.º quartil). */
function q3(values) {
  if (!values || values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = Math.ceil(sorted.length * 0.75) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
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
  const h1 = String(produto?.campo_hierarquico_1 ?? 'unassigned').trim();
  const h2 = String(produto?.campo_hierarquico_2 ?? '').trim();
  if (h2) return hierarchyKey([h1, h2]);
  return hierarchyKey([h1]);
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

function snapshotProduto(produto) {
  return {
    id: produto.id,
    campo_hierarquico_1: produto.campo_hierarquico_1,
    campo_hierarquico_2: produto.campo_hierarquico_2,
    abcd: produto.abcd,
  };
}

/** Etapa 1 — lucro por grupo (nível 2 da descrição), vendas 90d sem outliers. */
function etapa1_listar(produtos, itensPorProduto) {
  const lucroPorGrupo = {};
  for (const produto of produtos) {
    const { lucro } = calcularLucroSkuComQ4(produto, itensPorProduto);
    const key = grupoAbcdKey(produto);
    lucroPorGrupo[key] = (lucroPorGrupo[key] || 0) + lucro;
  }

  const lista = Object.entries(lucroPorGrupo).map(([id, lucro]) => ({ id, lucro }));

  return {
    lista,
    grupos_nivel_2: lista.length,
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

function produtoAbcdVazio(produto) {
  return !String(produto?.abcd ?? '').trim();
}

function buildJobCacheSlim(fields) {
  return {
    run_id: fields.run_id,
    created_at: fields.created_at,
    modo: fields.modo,
    somente_abcd_vazio: fields.somente_abcd_vazio,
    batch_size: fields.batch_size,
    mapaAbcdGrupo: fields.mapaAbcdGrupo,
    produto_ids: fields.produto_ids,
    grupos_nivel_2: fields.grupos_nivel_2,
    total_produtos: fields.total_produtos,
    pedidos_90d: fields.pedidos_90d,
  };
}

async function fetchProdutosSnapshotPorIds(db, ids) {
  if (!ids?.length) return [];

  try {
    const rows = await db.Produto.filter({ id: ids });
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
    if (list.length) return list.map(snapshotProduto);
  } catch {
    // fallback abaixo
  }

  const out = [];
  for (let i = 0; i < ids.length; i += UPDATE_CONCURRENCY) {
    const chunk = ids.slice(i, i + UPDATE_CONCURRENCY);
    const fetched = await Promise.all(
      chunk.map(async (id) => {
        try {
          const row = await db.Produto.get(id);
          return row ? snapshotProduto(row) : null;
        } catch {
          try {
            const rows = await db.Produto.filter({ id });
            const first = Array.isArray(rows) ? rows[0] : rows;
            return first ? snapshotProduto(first) : null;
          } catch {
            return null;
          }
        }
      }),
    );
    for (const row of fetched) {
      if (row) out.push(row);
    }
  }
  return out;
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
  return `abcd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════
// FETCH COM PAGINAÇÃO
// ═══════════════════════════════════════════════════════════════

async function fetchProdutosComPaginacao(entities, pageSize = 500) {
  const todos = [];
  let skip = 0;
  let temMais = true;

  while (temMais) {
    const batch = await entities.Produto.list('-created_date', pageSize, skip);
    if (!batch || batch.length === 0) {
      temMais = false;
    } else {
      for (const produto of batch) todos.push(produto);
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
// FASES DO JOB — preparar (lista+ordena+grupos) → gravar (por SKU em blocos)
// ═══════════════════════════════════════════════════════════════

async function carregarDados90d(db) {
  const hoje = new Date();
  const data90d = new Date();
  data90d.setDate(hoje.getDate() - 90);
  const dataISO = data90d.toISOString();

  const produtos = await fetchProdutosComPaginacao(db);
  const itensPorProduto = {};
  let pedidos90d = 0;
  let skip = 0;
  const pageSize = 500;
  let temMais = true;

  while (temMais) {
    const batch = await db.PedidoVenda.filter(
      { tipo: 'PDV', status: { $ne: 'Cancelado' }, created_date: { $gte: dataISO } },
      '-created_date',
      pageSize,
      skip,
    );

    if (!batch || batch.length === 0) {
      temMais = false;
    } else {
      pedidos90d += batch.length;
      for (const pedido of batch) {
        for (const it of pedido.itens || []) {
          const pid = String(it?.produto_id ?? '');
          if (!pid) continue;
          if (!itensPorProduto[pid]) itensPorProduto[pid] = [];
          itensPorProduto[pid].push(it);
        }
      }
      skip += pageSize;
      if (batch.length < pageSize) temMais = false;
    }
  }

  return { produtos, itensPorProduto, dataISO, pedidos_90d: pedidos90d };
}

async function persistirCacheJob(db, cache) {
  try {
    await saveJobCache(db, cache);
    const loaded = await loadJobCache(db);
    if (loaded?.run_id === cache.run_id) {
      return true;
    }
  } catch {
    // cliente recebe job_cache na resposta
  }
  return false;
}

function buildUpdateData(produto, mapaAbcdGrupo) {
  const grupoKey = grupoAbcdKey(produto);
  return { abcd: mapaAbcdGrupo[grupoKey] || 'D' };
}

async function gravarBloco(db, cache, offset, batchSize) {
  const ids = cache.produto_ids.slice(offset, offset + batchSize);
  if (!ids.length) {
    return { atualizados: 0, concluido: true, proximo_offset: offset };
  }

  const snapshotById = new Map((cache.produtos_snapshot || []).map((p) => [String(p.id), p]));
  const faltantes = ids.filter((id) => !snapshotById.has(String(id)));
  if (faltantes.length) {
    const fetched = await fetchProdutosSnapshotPorIds(db, faltantes);
    for (const produto of fetched) snapshotById.set(String(produto.id), produto);
  }

  const mapa = cache.mapaAbcdGrupo || {};
  const updates = [];

  for (const id of ids) {
    const produto = snapshotById.get(String(id));
    if (!produto) continue;
    updates.push({ id, data: buildUpdateData(produto, mapa) });
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
    somente_abcd_vazio: somenteAbcdVazio,
    batch_size: DEFAULT_BATCH_SIZE,
  };
}

async function runPreparar(db, body, modo, somenteAbcdVazio, batchSize) {
  const { produtos, itensPorProduto, pedidos_90d } = await carregarDados90d(db);

  if (somenteAbcdVazio && produtos.filter(produtoAbcdVazio).length === 0) {
    await clearJobCache(db);
    return {
      status: 'sem_alteracao',
      fase: 'preparar',
      mensagem: 'Nenhum produto com ABCD vazio no cadastro.',
      modo,
      somente_abcd_vazio: true,
      concluido: true,
      total_produtos: produtos.length,
    };
  }

  const itensPorProdutoMap = itensPorProduto;
  const etapa1 = etapa1_listar(produtos, itensPorProdutoMap);
  const etapa2 = etapa2_ordenarDistribuicao(etapa1.lista);
  const mapaAbcdGrupo = etapa3_classificarAbcd(etapa2.ranking, etapa2.totalLucroPositivo);

  const produtoIds = produtos
    .filter((p) => !somenteAbcdVazio || produtoAbcdVazio(p))
    .map((p) => p.id);

  const runId = String(body.run_id || newRunId());
  const cache = buildJobCacheSlim({
    run_id: runId,
    created_at: new Date().toISOString(),
    modo,
    somente_abcd_vazio: somenteAbcdVazio,
    batch_size: batchSize,
    mapaAbcdGrupo,
    grupos_nivel_2: etapa1.grupos_nivel_2,
    total_produtos: etapa1.total_produtos,
    produto_ids: produtoIds,
    pedidos_90d,
  });

  const cacheNoServidor = await persistirCacheJob(db, cache);
  const totalPendentes = produtoIds.length;
  const totalBlocos = totalPendentes > 0 ? Math.ceil(totalPendentes / batchSize) : 0;

  return {
    status: 'preparado',
    fase: 'preparar',
    run_id: runId,
    job_cache: cache,
    cache_no_servidor: cacheNoServidor,
    modo,
    somente_abcd_vazio: somenteAbcdVazio,
    total_produtos: etapa1.total_produtos,
    total_pendentes: totalPendentes,
    grupos_nivel_2: etapa1.grupos_nivel_2,
    batch_size: batchSize,
    total_blocos: totalBlocos,
    proximo_offset: 0,
    concluido: totalPendentes === 0,
    pedidos_90d,
    proxima_fase: 'gravar',
  };
}

async function runGravar(db, body, batchSize) {
  const { cache, source } = await resolveJobCache(db, body);
  if (!cache?.run_id) {
    return {
      status: 'erro',
      fase: 'gravar',
      error: 'Nenhum job preparado. Execute preparar antes de gravar.',
    };
  }

  if (!cache.mapaAbcdGrupo || !cache.produto_ids?.length) {
    return {
      status: 'erro',
      fase: 'gravar',
      error: 'Cálculo pendente. Execute preparar antes de gravar.',
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
    versao: VERSAO,
    regras: regrasResposta(cache.somente_abcd_vazio),
    timestamp: new Date().toISOString(),
  };
}

async function runGravarTodosBlocos(db, body, batchSize) {
  const prep = await runPreparar(
    db,
    body,
    body.modo || 'agendado',
    body.somente_abcd_vazio != null ? Boolean(body.somente_abcd_vazio) : false,
    batchSize,
  );

  if (prep.status === 'sem_alteracao' || prep.concluido) {
    return {
      ...prep,
      versao: VERSAO,
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
      {
        ...body,
        offset,
        run_id: prep.run_id,
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
    modo: prep.modo,
    somente_abcd_vazio: prep.somente_abcd_vazio,
    atualizados: totalAtualizados,
    processados: totalAtualizados,
    total_produtos: prep.total_produtos,
    total_pendentes: prep.total_pendentes,
    grupos_nivel_2: prep.grupos_nivel_2,
    total_blocos: prep.total_blocos,
    batch_size: batchSize,
    versao: VERSAO,
    regras: regrasResposta(prep.somente_abcd_vazio),
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// JOB PRINCIPAL — IQR por SKU + curva ABCD no nível hierárquico 2 (somente campo abcd)
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
        versao: VERSAO,
        regras: regrasResposta(somenteAbcdVazio),
        timestamp: new Date().toISOString(),
      });
    }

    if (fase === 'listar') {
      const prep = await runPreparar(db, body, modo, somenteAbcdVazio, batchSize);
      return Response.json({
        ...prep,
        status: prep.status === 'preparado' ? 'listado' : prep.status,
        fase: 'listar',
        etapa: 'listar',
        proxima_fase: 'classificar',
        versao: VERSAO,
        regras: regrasResposta(somenteAbcdVazio),
        timestamp: new Date().toISOString(),
      });
    }

    if (fase === 'classificar') {
      const { cache } = await resolveJobCache(db, body);
      if (cache?.mapaAbcdGrupo && cache?.produto_ids) {
        const size = cache.batch_size || batchSize;
        const totalPendentes = cache.produto_ids.length;
        const totalBlocos = totalPendentes > 0 ? Math.ceil(totalPendentes / size) : 0;
        return Response.json({
          status: 'classificado',
          fase: 'classificar',
          etapa: 'classificar',
          run_id: cache.run_id,
          job_cache: cache,
          cache_no_servidor: false,
          modo: cache.modo,
          somente_abcd_vazio: cache.somente_abcd_vazio,
          total_produtos: cache.total_produtos,
          total_pendentes: totalPendentes,
          grupos_nivel_2: cache.grupos_nivel_2,
          batch_size: size,
          total_blocos: totalBlocos,
          proximo_offset: 0,
          concluido: totalPendentes === 0,
          proxima_fase: 'gravar',
          versao: VERSAO,
          regras: regrasResposta(Boolean(cache.somente_abcd_vazio)),
          timestamp: new Date().toISOString(),
        });
      }

      const prep = await runPreparar(db, body, modo, somenteAbcdVazio, batchSize);
      return Response.json({
        ...prep,
        status: prep.status === 'preparado' ? 'classificado' : prep.status,
        fase: 'classificar',
        etapa: 'classificar',
        proxima_fase: 'gravar',
        versao: VERSAO,
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
      versao: VERSAO,
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
