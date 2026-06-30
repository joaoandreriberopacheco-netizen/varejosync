import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const JANELA_DIAS = 90;
const LEAD_TIME_PADRAO = 20;

function q3(values: number[]) {
  if (!values || values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = Math.ceil(sorted.length * 0.75) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function normalizeUnitCode(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/²/g, '2')
    .replace(/\s/g, '');
}

function lineQuantityBase(item: Record<string, unknown>) {
  const qtyBase = item?.quantidade_base;
  if (qtyBase != null && Number.isFinite(Number(qtyBase))) {
    return Number(qtyBase) || 0;
  }
  const qty = Number(item?.quantidade) || 0;
  const fator = Number(item?.fator_conversao) || 1;
  return qty * fator;
}

function pedidoElegivel(pedido: Record<string, unknown>) {
  const status = String(pedido?.status ?? '');
  if (status === 'Cancelado') return false;
  const tipo = String(pedido?.tipo ?? 'PDV').toUpperCase();
  return tipo === 'PDV' || tipo === 'PEDIDO';
}

function resolvePrimaryUnit(produto: Record<string, unknown>) {
  const principal = normalizeUnitCode(produto?.unidade_principal);
  if (principal) return principal;
  const alts = Array.isArray(produto?.unidades_alternativas) ? produto.unidades_alternativas : [];
  const f1 = alts.find((a: Record<string, unknown>) => Number(a?.fator_conversao) === 1);
  return normalizeUnitCode(f1?.unidade) || 'UN';
}

function buildPurchaseOptions(produto: Record<string, unknown>) {
  const principal = resolvePrimaryUnit(produto);
  const options: Array<{ unidade: string; fator_conversao: number; is_primary?: boolean }> = [
    { unidade: principal, fator_conversao: 1, is_primary: true },
  ];
  const alts = Array.isArray(produto?.unidades_alternativas) ? produto.unidades_alternativas : [];
  for (const item of alts) {
    if (!item?.unidade || item?.ativo === false) continue;
    const unidade = normalizeUnitCode(item.unidade);
    if (!unidade || options.some((o) => o.unidade === unidade)) continue;
    options.push({
      unidade,
      fator_conversao: Math.max(1, Number(item.fator_conversao) || 1),
    });
  }
  return options;
}

function resolveUnidadeVitrineCompra(produto: Record<string, unknown>) {
  const options = buildPurchaseOptions(produto);
  const principal = resolvePrimaryUnit(produto);
  const candidatos = [
    produto?.unidade_vitrine,
    produto?.unidade_apresentacao_default,
    produto?.unidade_show_comercial,
    principal,
  ];
  for (const raw of candidatos) {
    const u = normalizeUnitCode(raw);
    if (u && options.some((o) => o.unidade === u)) return u;
  }
  const nonPrimary = options.find((o) => o.unidade !== principal);
  return nonPrimary?.unidade || principal || 'UN';
}

function resolveFatorVitrine(produto: Record<string, unknown>) {
  const unidade = resolveUnidadeVitrineCompra(produto);
  const options = buildPurchaseOptions(produto);
  const opt = options.find((o) => o.unidade === unidade) || options[0];
  return {
    unidade,
    fator: Math.max(1, Number(opt?.fator_conversao) || 1),
  };
}

function resolveLoteCompraVitrine(produto: Record<string, unknown>) {
  const explicito = Number(produto?.lote_compra_vitrine);
  if (explicito > 1) return explicito;
  return 0;
}

function resolveLoteCompraBase(produto: Record<string, unknown>) {
  const loteVitrine = resolveLoteCompraVitrine(produto);
  const { fator } = resolveFatorVitrine(produto);
  if (loteVitrine > 1) return loteVitrine * fator;
  return Math.max(1, fator);
}

function arredondarQuantidadeSugestao(quantityBase: number, produto: Record<string, unknown>) {
  const base = Number(quantityBase) || 0;
  if (base <= 0) return 0;
  const pack = resolveLoteCompraBase(produto);
  if (pack <= 1) return Math.max(1, Math.ceil(base));
  return Math.ceil(base / pack) * pack;
}

function buildItensPorProdutoId(pedidos: Record<string, unknown>[]) {
  const map: Record<string, Record<string, unknown>[]> = {};
  for (const pedido of pedidos || []) {
    for (const it of (Array.isArray(pedido.itens) ? pedido.itens : []) as Record<string, unknown>[]) {
      const pid = String(it?.produto_id ?? '');
      if (!pid) continue;
      if (!map[pid]) map[pid] = [];
      map[pid].push(it);
    }
  }
  return map;
}

function calcularVendasSemOutliers(itens: Record<string, unknown>[]) {
  const quantidades = (itens || [])
    .map((it) => lineQuantityBase(it))
    .filter((qty) => qty > 0);

  if (quantidades.length === 0) {
    return { quantidadeLimpa: 0, outliersDescartados: 0, linhasTotal: 0, teveVenda: false };
  }

  const limiteQ3 = quantidades.length < 4 ? Infinity : q3(quantidades);
  const core = quantidades.filter((q) => q <= limiteQ3);
  const quantidadeLimpa = core.reduce((acc, q) => acc + q, 0);

  return {
    quantidadeLimpa,
    outliersDescartados: quantidades.length - core.length,
    linhasTotal: quantidades.length,
    teveVenda: quantidadeLimpa > 0,
  };
}

function calcularMetas(
  produto: Record<string, unknown>,
  itens: Record<string, unknown>[],
) {
  const leadTime = Math.max(1, Number(produto?.tempo_reposicao_dias) || LEAD_TIME_PADRAO);
  const vendas = calcularVendasSemOutliers(itens);

  if (!vendas.teveVenda) {
    return {
      atualizar: false,
      motivo: 'sem_venda',
      leadTime,
      ...vendas,
    };
  }

  const m = vendas.quantidadeLimpa / JANELA_DIAS;
  const idealBase = m * leadTime;
  const minimoBase = m * 1.5 * leadTime;
  const { unidade, fator } = resolveFatorVitrine(produto);

  let estoqueIdeal = arredondarQuantidadeSugestao(idealBase, produto);
  let estoqueMinimo = arredondarQuantidadeSugestao(minimoBase, produto);
  if (estoqueMinimo < estoqueIdeal) estoqueMinimo = estoqueIdeal;

  return {
    atualizar: true,
    estoque_minimo: estoqueMinimo,
    estoque_ideal: estoqueIdeal,
    venda_media_dia: m,
    lead_time_dias: leadTime,
    unidade_vitrine_compra: unidade,
    fator_vitrine: fator,
    lote_compra_vitrine: resolveLoteCompraVitrine(produto) || null,
    quantidade_limpa_90d: vendas.quantidadeLimpa,
    outliers_descartados: vendas.outliersDescartados,
    linhas_venda_total: vendas.linhasTotal,
    metas_estoque_atualizado_em: new Date().toISOString(),
    metas_estoque_versao: 'v3-media-90d-lead-time',
  };
}

async function fetchPedidos90d(
  entities: ReturnType<typeof createClientFromRequest>['entities'],
  dataISO: string,
  pageSize = 500,
) {
  const todos: Record<string, unknown>[] = [];
  let skip = 0;
  let temMais = true;

  while (temMais) {
    const batch = await entities.PedidoVenda.filter(
      { status: { $ne: 'Cancelado' }, created_date: { $gte: dataISO } },
      '-created_date',
      pageSize,
      skip,
    );

    if (!batch || batch.length === 0) {
      temMais = false;
    } else {
      todos.push(...batch.filter(pedidoElegivel));
      skip += pageSize;
      if (batch.length < pageSize) temMais = false;
    }
  }

  return todos;
}

const DEFAULT_BATCH_SIZE = 50;
const UPDATE_CONCURRENCY = 5;
const CACHE_KEY = 'metas_estoque_job_run';
const VERSAO = 'v4-slim-cache-servidor';

async function parseRequestBody(req: Request) {
  try {
    const raw = await req.text();
    if (!raw?.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function newRunId() {
  return `metas-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function fetchProdutosComPaginacao(
  entities: ReturnType<typeof createClientFromRequest>['entities'],
  pageSize = 500,
) {
  const todos: Record<string, unknown>[] = [];
  let skip = 0;
  let temMais = true;

  while (temMais) {
    const batch = await entities.Produto.filter({ tipo: 'Produto', ativo: true }, '-created_date', pageSize, skip);
    const rows = Array.isArray(batch) ? batch : [];
    if (!rows.length) {
      temMais = false;
    } else {
      todos.push(...rows);
      skip += pageSize;
      if (rows.length < pageSize) temMais = false;
    }
  }

  return todos;
}

function produtoMetasVazio(produto: Record<string, unknown>) {
  const em = Number(produto?.estoque_minimo) || 0;
  const ei = Number(produto?.estoque_ideal) || 0;
  return em <= 0 && ei <= 0;
}

function buildUpdatePayload(metas: Record<string, unknown>) {
  return {
    estoque_minimo: metas.estoque_minimo,
    estoque_ideal: metas.estoque_ideal,
    venda_media_dia: metas.venda_media_dia,
  };
}

function jobCacheRespostaSlim(cache: Record<string, unknown>) {
  return {
    run_id: cache.run_id,
    total_pendentes: Array.isArray(cache.produto_ids) ? cache.produto_ids.length : 0,
  };
}

async function persistirCacheJob(db: ReturnType<typeof createClientFromRequest>['entities'], cache: Record<string, unknown>) {
  try {
    await saveJobCache(db, cache);
    const loaded = await loadJobCache(db);
    return loaded?.run_id === cache.run_id;
  } catch {
    return false;
  }
}

async function loadJobCache(db: ReturnType<typeof createClientFromRequest>['entities']) {
  const configs = await db.ConfiguracoesVenda.list();
  return (configs?.[0] as Record<string, unknown>)?.[CACHE_KEY] ?? null;
}

async function resolveJobCache(
  db: ReturnType<typeof createClientFromRequest>['entities'],
  body: Record<string, unknown>,
) {
  if (body?.run_id) {
    const serverCache = (await loadJobCache(db)) as Record<string, unknown> | null;
    if (serverCache?.run_id && String(serverCache.run_id) === String(body.run_id)) {
      return { cache: serverCache, source: 'server' as const };
    }
  }

  const clientCache = body?.job_cache as Record<string, unknown> | undefined;
  if (clientCache?.run_id && clientCache.updates && Array.isArray(clientCache.produto_ids)) {
    return { cache: clientCache, source: 'client' as const };
  }

  const serverCache = await loadJobCache(db);
  return { cache: serverCache as Record<string, unknown> | null, source: 'server' as const };
}

async function saveJobCache(db: ReturnType<typeof createClientFromRequest>['entities'], cache: Record<string, unknown>) {
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

async function clearJobCache(db: ReturnType<typeof createClientFromRequest>['entities']) {
  const configs = await db.ConfiguracoesVenda.list();
  if (configs?.[0]?.id) {
    await db.ConfiguracoesVenda.update(configs[0].id, { [CACHE_KEY]: null });
  }
}

function regrasResposta(somenteMetasVazias: boolean) {
  return {
    janela_dias: JANELA_DIAS,
    lead_time_padrao: LEAD_TIME_PADRAO,
    media: 'qty_vendida_limpa / 90 dias (sem IEP/ABCD)',
    estoque_minimo: 'ponto de pedido = m × 1,5 × lead time',
    estoque_ideal: 'quantidade a repor = m × lead time',
    outliers: 'qty_linha > Q3 descartada',
    arredondamento: 'lote_compra_vitrine ou fator_vitrine',
    somente_metas_vazias: somenteMetasVazias,
    batch_size: DEFAULT_BATCH_SIZE,
  };
}

function computeSnapshot(
  produtos: Record<string, unknown>[],
  itensPorProduto: Record<string, Record<string, unknown>[]>,
  somenteMetasVazias: boolean,
  pedidosAnalisados: number,
) {
  const updates: Record<string, Record<string, unknown>> = {};
  const produto_ids: string[] = [];
  let ignorados_trava_manual = 0;
  let ignorados_sem_venda = 0;

  for (const produto of produtos) {
    if (produto.estoque_trava_manual === true) {
      ignorados_trava_manual += 1;
      continue;
    }
    if (somenteMetasVazias && !produtoMetasVazio(produto)) continue;

    const pid = String(produto.id ?? '');
    const metas = calcularMetas(produto, itensPorProduto[pid] || []);
    if (!metas.atualizar) {
      ignorados_sem_venda += 1;
      continue;
    }

    produto_ids.push(pid);
    updates[pid] = buildUpdatePayload(metas);
  }

  return {
    produto_ids,
    updates,
    total_produtos: produtos.length,
    ignorados_trava_manual,
    ignorados_sem_venda,
    pedidos_analisados: pedidosAnalisados,
  };
}

async function runPreparar(
  db: ReturnType<typeof createClientFromRequest>['entities'],
  body: Record<string, unknown>,
  modo: string,
  somenteMetasVazias: boolean,
  batchSize: number,
) {
  const hoje = new Date();
  const data90d = new Date();
  data90d.setDate(hoje.getDate() - JANELA_DIAS);
  const dataISO = data90d.toISOString();

  const [produtos, pedidos] = await Promise.all([
    fetchProdutosComPaginacao(db),
    fetchPedidos90d(db, dataISO),
  ]);

  const itensPorProduto = buildItensPorProdutoId(pedidos);
  const snapshot = computeSnapshot(
    produtos,
    itensPorProduto,
    somenteMetasVazias,
    pedidos.length,
  );

  if (somenteMetasVazias && snapshot.produto_ids.length === 0) {
    await clearJobCache(db);
    return {
      status: 'sem_alteracao',
      fase: 'preparar',
      mensagem: 'Nenhum produto sem metas de estoque para preencher.',
      modo,
      somente_metas_vazias: true,
      atualizados: 0,
      total_produtos: snapshot.total_produtos,
      concluido: true,
    };
  }

  const runId = String(body.run_id || newRunId());
  const cache = {
    run_id: runId,
    created_at: new Date().toISOString(),
    modo,
    somente_metas_vazias: somenteMetasVazias,
    batch_size: batchSize,
    versao: VERSAO,
    ...snapshot,
  };

  const cacheNoServidor = await persistirCacheJob(db, cache);
  if (!cacheNoServidor) {
    return {
      status: 'erro',
      fase: 'preparar',
      error:
        'Não foi possível guardar o job no servidor. Confirme que a função está publicada no Base44 e que ConfiguracoesVenda aceita o campo metas_estoque_job_run.',
      total_pendentes: snapshot.produto_ids.length,
      versao: VERSAO,
    };
  }

  const totalPendentes = snapshot.produto_ids.length;
  const totalBlocos = totalPendentes > 0 ? Math.ceil(totalPendentes / batchSize) : 0;

  return {
    status: 'preparado',
    fase: 'preparar',
    run_id: runId,
    job_cache: jobCacheRespostaSlim(cache),
    cache_no_servidor: true,
    modo,
    somente_metas_vazias: somenteMetasVazias,
    total_produtos: snapshot.total_produtos,
    total_pendentes: totalPendentes,
    ignorados_trava_manual: snapshot.ignorados_trava_manual,
    ignorados_sem_venda: snapshot.ignorados_sem_venda,
    pedidos_analisados: pedidos.length,
    batch_size: batchSize,
    total_blocos: totalBlocos,
    proximo_offset: 0,
    concluido: totalPendentes === 0,
    versao: VERSAO,
  };
}

async function gravarBloco(
  db: ReturnType<typeof createClientFromRequest>['entities'],
  cache: Record<string, unknown>,
  offset: number,
  batchSize: number,
) {
  const ids = (cache.produto_ids as string[]).slice(offset, offset + batchSize);
  const updates = (cache.updates || {}) as Record<string, Record<string, unknown>>;

  if (!ids.length) {
    return { atualizados: 0, concluido: true, proximo_offset: offset };
  }

  const payload = ids
    .filter((id) => updates[id])
    .map((id) => ({ id, data: updates[id] }));

  for (let i = 0; i < payload.length; i += UPDATE_CONCURRENCY) {
    const chunk = payload.slice(i, i + UPDATE_CONCURRENCY);
    await Promise.all(chunk.map(({ id, data }) => db.Produto.update(id, data)));
  }

  const proximo_offset = offset + ids.length;
  const concluido = proximo_offset >= (cache.produto_ids as string[]).length;

  return {
    atualizados: payload.length,
    concluido,
    proximo_offset,
  };
}

async function runGravar(
  db: ReturnType<typeof createClientFromRequest>['entities'],
  body: Record<string, unknown>,
  batchSize: number,
) {
  const { cache, source } = await resolveJobCache(db, body);
  if (!cache?.run_id) {
    return {
      status: 'erro',
      fase: 'gravar',
      error: 'Nenhum job preparado. Execute a fase preparar primeiro.',
    };
  }

  if (!cache.updates || !Array.isArray(cache.produto_ids) || !cache.produto_ids.length) {
    return {
      status: 'erro',
      fase: 'gravar',
      error:
        'Job incompleto no servidor. Execute preparar novamente (cache metas_estoque_job_run em ConfiguracoesVenda).',
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
  const size = Math.min(Math.max(10, Number(body.batch_size) || Number(cache.batch_size) || batchSize), 120);
  const totalPendentes = (cache.produto_ids as string[])?.length || 0;

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
  const totalBlocos = Math.ceil(totalPendentes / size);

  if (bloco.concluido && source === 'server') {
    await clearJobCache(db);
  }

  return {
    status: bloco.concluido ? 'sucesso' : 'em_andamento',
    fase: 'gravar',
    run_id: cache.run_id,
    modo: cache.modo,
    somente_metas_vazias: cache.somente_metas_vazias,
    batch_size: size,
    offset,
    proximo_offset: bloco.proximo_offset,
    bloco_atual: Math.min(Math.floor(offset / size) + 1, totalBlocos),
    total_blocos: totalBlocos,
    atualizados: bloco.atualizados,
    atualizados_acumulado: bloco.proximo_offset,
    total_pendentes: totalPendentes,
    total_produtos: cache.total_produtos,
    ignorados_sem_venda: cache.ignorados_sem_venda,
    ignorados_trava_manual: cache.ignorados_trava_manual,
    pedidos_analisados: cache.pedidos_analisados,
    concluido: bloco.concluido,
    versao: VERSAO,
    regras: regrasResposta(Boolean(cache.somente_metas_vazias)),
    timestamp: new Date().toISOString(),
  };
}

async function runGravarTodosBlocos(
  db: ReturnType<typeof createClientFromRequest>['entities'],
  body: Record<string, unknown>,
  batchSize: number,
) {
  const somenteMetasVazias = body.somente_metas_vazias != null ? Boolean(body.somente_metas_vazias) : false;
  const prep = await runPreparar(db, body, String(body.modo || 'agendado'), somenteMetasVazias, batchSize);

  if (prep.status === 'sem_alteracao' || prep.concluido) {
    return {
      ...prep,
      versao: VERSAO,
      regras: regrasResposta(somenteMetasVazias),
      timestamp: new Date().toISOString(),
    };
  }

  let offset = 0;
  let totalAtualizados = 0;
  let ultimoBloco: Record<string, unknown> | null = null;

  while (true) {
    ultimoBloco = await runGravar(
      db,
      { ...body, offset, run_id: prep.run_id, batch_size: batchSize },
      batchSize,
    );
    if (ultimoBloco.status === 'erro') return ultimoBloco;
    totalAtualizados += Number(ultimoBloco.atualizados) || 0;
    if (ultimoBloco.concluido) break;
    offset = Number(ultimoBloco.proximo_offset) || 0;
  }

  return {
    status: 'sucesso',
    fase: 'completo',
    modo: prep.modo,
    somente_metas_vazias: prep.somente_metas_vazias,
    atualizados: totalAtualizados,
    processados: totalAtualizados,
    total_produtos: prep.total_produtos,
    total_pendentes: prep.total_pendentes,
    ignorados_sem_venda: prep.ignorados_sem_venda,
    ignorados_trava_manual: prep.ignorados_trava_manual,
    pedidos_analisados: prep.pedidos_analisados,
    total_blocos: prep.total_blocos,
    batch_size: batchSize,
    versao: VERSAO,
    regras: regrasResposta(somenteMetasVazias),
    timestamp: new Date().toISOString(),
  };
}

async function runDiagnostico(db: ReturnType<typeof createClientFromRequest>['entities']) {
  const data90d = new Date();
  data90d.setDate(data90d.getDate() - JANELA_DIAS);
  const dataISO = data90d.toISOString();

  const [produtoSample, pedidoSample] = await Promise.all([
    db.Produto.filter({ tipo: 'Produto', ativo: true }, '-created_date', 1, 0),
    db.PedidoVenda.filter(
      { status: { $ne: 'Cancelado' }, created_date: { $gte: dataISO } },
      '-created_date',
      1,
      0,
    ),
  ]);

  return {
    status: 'ok',
    fase: 'diagnostico',
    versao: VERSAO,
    produto_sample: Array.isArray(produtoSample) ? produtoSample.length : produtoSample ? 1 : 0,
    pedido_sample: Array.isArray(pedidoSample) ? pedidoSample.length : pedidoSample ? 1 : 0,
    data_iso_90d: dataISO,
    timestamp: new Date().toISOString(),
  };
}

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
    const somenteMetasVazias =
      body.somente_metas_vazias != null ? Boolean(body.somente_metas_vazias) : false;
    const batchSize = Math.min(Math.max(10, Number(body.batch_size) || DEFAULT_BATCH_SIZE), 120);
    const fase = String(body.fase || '').toLowerCase();

    const db = isAutomation ? base44.asServiceRole.entities : base44.entities;

    if (fase === 'diagnostico' || fase === 'ping') {
      const diag = await runDiagnostico(db);
      return Response.json(diag);
    }

    if (fase === 'limpar') {
      await clearJobCache(db);
      return Response.json({ status: 'ok', fase: 'limpar', mensagem: 'Cache do job removido.' });
    }

    if (fase === 'preparar') {
      const prep = await runPreparar(db, body, modo, somenteMetasVazias, batchSize);
      return Response.json({
        ...prep,
        versao: VERSAO,
        regras: regrasResposta(somenteMetasVazias),
        timestamp: new Date().toISOString(),
      });
    }

    if (fase === 'gravar') {
      const gravar = await runGravar(db, body, batchSize);
      return Response.json(gravar);
    }

    if (modo === 'agendado' || !fase) {
      const result = await runGravarTodosBlocos(
        db,
        { ...body, modo, somente_metas_vazias: somenteMetasVazias },
        batchSize,
      );
      return Response.json(result);
    }

    const prep = await runPreparar(db, body, modo, somenteMetasVazias, batchSize);
    return Response.json({
      ...prep,
      versao: VERSAO,
      regras: regrasResposta(somenteMetasVazias),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[atualizarMetasEstoque]', message);
    return Response.json({ error: message, status: 'erro' }, { status: 500 });
  }
});
