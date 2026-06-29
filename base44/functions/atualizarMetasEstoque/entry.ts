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

function calcularMetas(produto: Record<string, unknown>, pedidos: Record<string, unknown>[]) {
  const leadTime = Math.max(1, Number(produto?.tempo_reposicao_dias) || LEAD_TIME_PADRAO);
  const vendas = calcularVendasSemOutliers(produto, pedidos);

  if (!vendas.teveVenda) {
    return { atualizar: false, motivo: 'sem_venda', leadTime, ...vendas };
  }

  const vendaMediaDia = vendas.quantidadeLimpa / JANELA_DIAS;
  const idealBase = vendaMediaDia * (leadTime / 2);
  const minimoBase = vendaMediaDia * (leadTime * 1.5);
  const { unidade, fator } = resolveFatorVitrine(produto);

  let estoqueIdeal = arredondarParaVitrineBase(idealBase, fator);
  let estoqueMinimo = arredondarParaVitrineBase(minimoBase, fator);
  if (estoqueMinimo < estoqueIdeal) estoqueMinimo = estoqueIdeal;

  return {
    atualizar: true,
    estoque_minimo: estoqueMinimo,
    estoque_ideal: estoqueIdeal,
    venda_media_dia: vendaMediaDia,
    lead_time_dias: leadTime,
    unidade_vitrine_compra: unidade,
    fator_vitrine: fator,
    quantidade_limpa_90d: vendas.quantidadeLimpa,
    outliers_descartados: vendas.outliersDescartados,
    linhas_venda_total: vendas.linhasTotal,
    metas_estoque_atualizado_em: new Date().toISOString(),
    metas_estoque_versao: 'v1-vendas90d-outliers-vitrine',
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

    const [produtos, pedidos] = await Promise.all([
      base44.entities.Produto.filter({ tipo: 'Produto', ativo: true }),
      fetchPedidos90d(base44, dataISO),
    ]);

    let atualizados = 0;
    let ignoradosTrava = 0;
    let ignoradosSemVenda = 0;

    for (const produto of produtos) {
      if (produto.estoque_trava_manual === true) {
        ignoradosTrava += 1;
        continue;
      }

      const metas = calcularMetas(produto, pedidos);
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
        ideal: '50% do lead time (venda média/dia)',
        minimo: '150% do lead time (venda média/dia)',
        outliers: 'qty_linha > Q3 descartada',
        arredondamento: 'multiplo_unidade_vitrine_compra',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
