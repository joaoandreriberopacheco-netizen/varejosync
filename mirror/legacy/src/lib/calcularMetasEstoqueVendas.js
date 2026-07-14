/**
 * Metas de estoque (mínimo / ideal) derivadas de vendas recentes.
 * Regras:
 * - Janela: 90 dias
 * - Outliers: linhas com quantidade > Q3 descartadas
 * - m = qty vendida / dias com estoque ≠ 0 (negativo conta)
 * - Lead time: tempo_reposicao_dias ou 20 dias
 * - Ponto de pedido (mínimo): m × 1,5 × lead time
 * - Ideal / pedido: m × lead time
 * - Arredondamento: lote_compra_vitrine ou fator da unidade de vitrine
 */

import { collectItensVendaProduto, lineQuantityBase } from '@/lib/calcularIepProdutos';
import {
  buildPurchaseUnitOptions,
  resolveUnidadeExibicaoParaCompras,
} from '@/lib/productUnits';
import {
  buildMapaSaldoFimDia,
  contarDiasComEstoqueAtivo,
} from '@/lib/estoqueSaldoDiario';

export const METAS_ESTOQUE_JANELA_DIAS = 90;
export const METAS_ESTOQUE_LEAD_TIME_PADRAO = 20;

function q3(values) {
  if (!values || values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = Math.ceil(sorted.length * 0.75) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

/** Fator de conversão da unidade de vitrine usada como referência de compra. */
export function resolveFatorUnidadeVitrineCompra(produto) {
  const unidade = resolveUnidadeExibicaoParaCompras(
    produto,
    {},
    produto?.unidade_principal || 'UN',
  );
  const options = buildPurchaseUnitOptions(produto);
  const opt =
    options.find((o) => o.unidade === unidade) ||
    options.find((o) => !o.is_primary) ||
    options[0];
  const fator = Math.max(1, Number(opt?.fator_conversao) || 1);
  return { unidade, fator };
}

/** Arredonda quantidade base para cima em múltiplos da embalagem de vitrine. */
export function arredondarParaVitrineBase(quantityBase, fatorVitrine) {
  const base = Number(quantityBase) || 0;
  if (base <= 0) return 0;
  const fator = Math.max(1, Number(fatorVitrine) || 1);
  const packs = Math.ceil(base / fator);
  return Math.max(fator, packs * fator);
}

/**
 * Soma vendas do SKU nos últimos 90 dias, excluindo linhas com qty acima de Q3.
 */
export function calcularVendasSemOutliersQuantidade(produto, pedidos90d) {
  const itens = collectItensVendaProduto(produto, pedidos90d);
  const quantidades = itens
    .map((it) => lineQuantityBase(it))
    .filter((qty) => qty > 0);

  if (quantidades.length === 0) {
    return {
      quantidadeLimpa: 0,
      outliersDescartados: 0,
      linhasTotal: 0,
      teveVenda: false,
    };
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

/**
 * Lote mínimo de compra em unidades de vitrine (ex.: palete = 100 sacos).
 */
export function resolveLoteCompraVitrine(produto) {
  const explicito = Number(produto?.lote_compra_vitrine);
  if (explicito > 1) return explicito;
  return 0;
}

/** Converte lote vitrine → unidade base (1 vitrine = fator base). */
export function resolveLoteCompraBase(produto) {
  const loteVitrine = resolveLoteCompraVitrine(produto);
  const { fator } = resolveFatorUnidadeVitrineCompra(produto);
  if (loteVitrine > 1) return loteVitrine * fator;
  return Math.max(1, fator);
}

export function arredondarQuantidadeSugestao(quantityBase, produto, roundingMode = 'auto') {
  const base = Number(quantityBase) || 0;
  if (base <= 0) return 0;

  const pack = resolveLoteCompraBase(produto);
  if (pack <= 1) return Math.max(1, Math.ceil(base));

  if (roundingMode === 'none') return base;
  if (roundingMode === 'down') {
    const q = Math.floor(base / pack) * pack;
    return q === 0 ? pack : q;
  }
  if (roundingMode === 'up') return Math.ceil(base / pack) * pack;

  const q = Math.round(base / pack) * pack;
  return q === 0 ? pack : q;
}

/** Média diária m = qty vendida (sem outliers) / dias com estoque ≠ 0. */
export function calcularMediaVendaDia(produto, pedidos90d, movimentacoesProduto, options = {}) {
  const janelaDias = options.janelaDias ?? METAS_ESTOQUE_JANELA_DIAS;
  const vendas = calcularVendasSemOutliersQuantidade(produto, pedidos90d);

  const saldoPorDia = buildMapaSaldoFimDia(
    movimentacoesProduto,
    produto?.estoque_atual,
    janelaDias,
  );
  const diasComEstoque = contarDiasComEstoqueAtivo(saldoPorDia);

  if (!vendas.teveVenda || diasComEstoque === 0) {
    return {
      mediaDia: 0,
      diasComEstoque,
      diasJanela: janelaDias,
      ...vendas,
      teveMedia: false,
    };
  }

  const mediaDia = vendas.quantidadeLimpa / diasComEstoque;

  return {
    mediaDia,
    diasComEstoque,
    diasJanela: janelaDias,
    ...vendas,
    teveMedia: mediaDia > 0,
  };
}

/**
 * Calcula metas de estoque para um produto (valores em unidade base).
 */
export function calcularMetasEstoqueParaProduto(produto, pedidos90d, options = {}) {
  const janelaDias = options.janelaDias ?? METAS_ESTOQUE_JANELA_DIAS;
  const leadTimePadrao = options.leadTimePadrao ?? METAS_ESTOQUE_LEAD_TIME_PADRAO;
  const movimentacoes = options.movimentacoes ?? [];

  const leadTime = Math.max(
    1,
    Number(produto?.tempo_reposicao_dias) || leadTimePadrao,
  );

  const media = calcularMediaVendaDia(produto, pedidos90d, movimentacoes, { janelaDias });
  if (!media.teveMedia) {
    return {
      atualizar: false,
      motivo: !media.teveVenda ? 'sem_venda' : 'sem_dias_com_estoque',
      lead_time_dias: leadTime,
      dias_com_estoque: media.diasComEstoque,
      ...media,
    };
  }

  const m = media.mediaDia;
  const idealBase = m * leadTime;
  const minimoBase = m * 1.5 * leadTime;

  const { unidade, fator } = resolveFatorUnidadeVitrineCompra(produto);
  const estoqueIdeal = arredondarQuantidadeSugestao(idealBase, produto, 'up');
  let estoqueMinimo = arredondarQuantidadeSugestao(minimoBase, produto, 'up');

  if (estoqueMinimo < estoqueIdeal) {
    estoqueMinimo = estoqueIdeal;
  }

  return {
    atualizar: true,
    estoque_minimo: estoqueMinimo,
    estoque_ideal: estoqueIdeal,
    venda_media_dia: m,
    lead_time_dias: leadTime,
    unidade_vitrine_compra: unidade,
    fator_vitrine: fator,
    lote_compra_vitrine: resolveLoteCompraVitrine(produto) || null,
    lote_compra_base: resolveLoteCompraBase(produto),
    dias_com_estoque: media.diasComEstoque,
    quantidade_limpa_90d: media.quantidadeLimpa,
    outliers_descartados: media.outliersDescartados,
    linhas_venda_total: media.linhasTotal,
    metas_estoque_atualizado_em: new Date().toISOString(),
    metas_estoque_versao: 'v2-media-dias-estoque-lote-vitrine',
  };
}

/** Fator de embalagem para arredondamento na Sugestão de Compra. */
export function resolveFatorEmbalagemCompra(produto) {
  return resolveLoteCompraBase(produto);
}
