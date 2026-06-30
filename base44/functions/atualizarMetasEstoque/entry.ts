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

function localDateKey(value: unknown) {
  const d = new Date(String(value || ''));
  if (Number.isNaN(d.getTime())) return 'sem-data';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function deltaMovimento(mov: Record<string, unknown>) {
  const q = Number(mov?.quantidade) || 0;
  const t = mov?.tipo;
  if (t === 'Entrada') return q;
  if (t === 'Saída') return -q;
  return 0;
}

function buildMapaSaldoFimDia(
  movimentacoes: Record<string, unknown>[],
  estoqueAtual: number,
  janelaDias = JANELA_DIAS,
) {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - janelaDias);
  const diaInicio = localDateKey(inicio);

  const movsJanela = movimentacoes.filter((m) => {
    const dia = localDateKey(m?.created_date);
    return dia !== 'sem-data' && dia >= diaInicio;
  });

  const deltasNaJanela = movsJanela.reduce((acc, m) => acc + deltaMovimento(m), 0);
  let saldo = (Number(estoqueAtual) || 0) - deltasNaJanela;

  const movsPorDia = new Map<string, Record<string, unknown>[]>();
  for (const m of movsJanela.sort((a, b) =>
    new Date(String(a?.created_date || 0)).getTime() - new Date(String(b?.created_date || 0)).getTime()
  )) {
    const dia = localDateKey(m?.created_date);
    if (!movsPorDia.has(dia)) movsPorDia.set(dia, []);
    movsPorDia.get(dia)!.push(m);
  }

  const saldoPorDia = new Map<string, number>();
  const dias: string[] = [];
  const cur = new Date(inicio);
  cur.setHours(12, 0, 0, 0);
  const end = new Date(hoje);
  end.setHours(12, 0, 0, 0);
  while (cur <= end) {
    dias.push(localDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }

  for (const dia of dias) {
    for (const m of movsPorDia.get(dia) || []) {
      saldo += deltaMovimento(m);
    }
    saldoPorDia.set(dia, saldo);
  }

  return saldoPorDia;
}

function contarDiasComEstoqueAtivo(saldoPorDia: Map<string, number>) {
  let count = 0;
  for (const saldo of saldoPorDia.values()) {
    if (saldo !== 0) count += 1;
  }
  return count;
}

function arredondarParaVitrineBase(quantityBase: number, fatorVitrine: number) {
  const base = Number(quantityBase) || 0;
  if (base <= 0) return 0;
  const fator = Math.max(1, Number(fatorVitrine) || 1);
  const packs = Math.ceil(base / fator);
  return Math.max(fator, packs * fator);
}

function collectItensProduto(produto: Record<string, unknown>, pedidos: Record<string, unknown>[]) {
  const pid = String(produto.id ?? '');
  return pedidos
    .flatMap((p) => (Array.isArray(p.itens) ? p.itens : []) as Record<string, unknown>[])
    .filter((it) => String(it?.produto_id ?? '') === pid);
}

function calcularVendasSemOutliers(produto: Record<string, unknown>, pedidos: Record<string, unknown>[]) {
  const quantidades = collectItensProduto(produto, pedidos)
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
  pedidos: Record<string, unknown>[],
  movimentacoes: Record<string, unknown>[],
) {
  const leadTime = Math.max(1, Number(produto?.tempo_reposicao_dias) || LEAD_TIME_PADRAO);
  const vendas = calcularVendasSemOutliers(produto, pedidos);
  const saldoPorDia = buildMapaSaldoFimDia(movimentacoes, Number(produto?.estoque_atual) || 0);
  const diasComEstoque = contarDiasComEstoqueAtivo(saldoPorDia);

  if (!vendas.teveVenda || diasComEstoque === 0) {
    return {
      atualizar: false,
      motivo: !vendas.teveVenda ? 'sem_venda' : 'sem_dias_com_estoque',
      leadTime,
      diasComEstoque,
      ...vendas,
    };
  }

  const m = vendas.quantidadeLimpa / diasComEstoque;
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
    dias_com_estoque: diasComEstoque,
    quantidade_limpa_90d: vendas.quantidadeLimpa,
    outliers_descartados: vendas.outliersDescartados,
    linhas_venda_total: vendas.linhasTotal,
    metas_estoque_atualizado_em: new Date().toISOString(),
    metas_estoque_versao: 'v2-media-dias-estoque-lote-vitrine',
  };
}

async function fetchPedidos90d(base44: ReturnType<typeof createClientFromRequest>, dataISO: string, pageSize = 500) {
  const todos: Record<string, unknown>[] = [];
  let skip = 0;
  let temMais = true;

  while (temMais) {
    const batch = await base44.entities.PedidoVenda.filter(
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
    }
  }

  return todos;
}

async function fetchMovimentacoes90d(
  base44: ReturnType<typeof createClientFromRequest>,
  dataISO: string,
  pageSize = 500,
) {
  const todos: Record<string, unknown>[] = [];
  let skip = 0;
  let temMais = true;

  while (temMais) {
    const batch = await base44.entities.MovimentacaoEstoque.filter(
      { created_date: { $gte: dataISO } },
      'created_date',
      pageSize,
      skip,
    );

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

function groupMovsPorProduto(movs: Record<string, unknown>[]) {
  const map: Record<string, Record<string, unknown>[]> = {};
  for (const m of movs) {
    const pid = String(m?.produto_id ?? '');
    if (!pid) continue;
    if (!map[pid]) map[pid] = [];
    map[pid].push(m);
  }
  return map;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const hoje = new Date();
    const data90d = new Date();
    data90d.setDate(hoje.getDate() - JANELA_DIAS);
    const dataISO = data90d.toISOString();

    const [produtos, pedidos, movimentacoes] = await Promise.all([
      base44.entities.Produto.filter({ tipo: 'Produto', ativo: true }),
      fetchPedidos90d(base44, dataISO),
      fetchMovimentacoes90d(base44, dataISO),
    ]);

    const movsPorProduto = groupMovsPorProduto(movimentacoes);

    let atualizados = 0;
    let ignoradosTrava = 0;
    let ignoradosSemVenda = 0;

    for (const produto of produtos) {
      if (produto.estoque_trava_manual === true) {
        ignoradosTrava += 1;
        continue;
      }

      const metas = calcularMetas(produto, pedidos, movsPorProduto[String(produto.id)] || []);
      if (!metas.atualizar) {
        ignoradosSemVenda += 1;
        continue;
      }

      await base44.entities.Produto.update(produto.id, {
        estoque_minimo: metas.estoque_minimo,
        estoque_ideal: metas.estoque_ideal,
        venda_media_dia: metas.venda_media_dia,
        metas_estoque_lead_time_dias: metas.lead_time_dias,
        metas_estoque_unidade_compra: metas.unidade_vitrine_compra,
        metas_estoque_quantidade_limpa_90d: metas.quantidade_limpa_90d,
        metas_estoque_outliers_descartados: metas.outliers_descartados,
        metas_estoque_dias_com_estoque: metas.dias_com_estoque,
        metas_estoque_atualizado_em: metas.metas_estoque_atualizado_em,
        metas_estoque_versao: metas.metas_estoque_versao,
      });
      atualizados += 1;
    }

    return Response.json({
      status: 'sucesso',
      produtos_ativos: produtos.length,
      atualizados,
      ignorados_trava_manual: ignoradosTrava,
      ignorados_sem_venda: ignoradosSemVenda,
      pedidos_analisados: pedidos.length,
      regras: {
        janela_dias: JANELA_DIAS,
        lead_time_padrao: LEAD_TIME_PADRAO,
        media: 'qty_vendida / dias_com_estoque_diferente_de_zero',
        ponto_pedido: 'm × 1,5 × lead time',
        ideal: 'm × lead time',
        outliers: 'qty_linha > Q3 descartada',
        arredondamento: 'lote_compra_vitrine ou fator_vitrine',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
