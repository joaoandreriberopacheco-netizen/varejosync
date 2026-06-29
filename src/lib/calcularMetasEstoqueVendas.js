/**
 * Metas de estoque (mínimo / ideal) derivadas de vendas recentes.
 * Regras de negócio acordadas:
 * - Janela: 90 dias
 * - Outliers: linhas com quantidade > Q3 (4.º quartil) são descartadas
 * - Lead time: tempo_reposicao_dias ou 20 dias
 * - Ideal na chegada: 50% do lead time de venda média
 * - Mínimo (ponto de pedido): 150% do lead time de venda média
 * - Arredondamento: múltiplos da unidade de vitrine para compra
 */

import { collectItensVendaProduto, lineQuantityBase } from '@/lib/calcularIepProdutos';
import {
  buildPurchaseUnitOptions,
  resolveUnidadeExibicaoParaCompras,
} from '@/lib/productUnits';

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
 * Calcula metas de estoque para um produto (valores em unidade base / fator-1).
 * @returns {{ atualizar: boolean, estoque_minimo?: number, estoque_ideal?: number, [key: string]: unknown }}
 */
export function calcularMetasEstoqueParaProduto(produto, pedidos90d, options = {}) {
  const janelaDias = options.janelaDias ?? METAS_ESTOQUE_JANELA_DIAS;
  const leadTimePadrao = options.leadTimePadrao ?? METAS_ESTOQUE_LEAD_TIME_PADRAO;

  const leadTime = Math.max(
    1,
    Number(produto?.tempo_reposicao_dias) || leadTimePadrao,
  );

  const vendas = calcularVendasSemOutliersQuantidade(produto, pedidos90d);
  if (!vendas.teveVenda) {
    return {
      atualizar: false,
      motivo: 'sem_venda',
      lead_time_dias: leadTime,
      ...vendas,
    };
  }

  const vendaMediaDia = vendas.quantidadeLimpa / janelaDias;
  const idealBase = vendaMediaDia * (leadTime / 2);
  const minimoBase = vendaMediaDia * (leadTime * 1.5);

  const { unidade, fator } = resolveFatorUnidadeVitrineCompra(produto);
  let estoqueIdeal = arredondarParaVitrineBase(idealBase, fator);
  let estoqueMinimo = arredondarParaVitrineBase(minimoBase, fator);

  if (estoqueMinimo < estoqueIdeal) {
    estoqueMinimo = estoqueIdeal;
  }

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

/** Fator de embalagem para arredondamento na Sugestão de Compra (vitrine > legado). */
export function resolveFatorEmbalagemCompra(produto) {
  const { fator } = resolveFatorUnidadeVitrineCompra(produto);
  if (fator > 1) return fator;
  return Math.max(1, Number(produto?.unidades_por_pacote) || 1);
}
