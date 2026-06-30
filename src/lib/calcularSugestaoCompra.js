/**
 * Sugestão de compra: elegibilidade e quantidade a partir de vendas 90d.
 * Ver calcularMetasEstoqueVendas.js para fórmulas de m, ponto de pedido e lote.
 */

import {
  METAS_ESTOQUE_JANELA_DIAS,
  METAS_ESTOQUE_LEAD_TIME_PADRAO,
  arredondarQuantidadeSugestao,
  calcularMediaVendaDia,
  resolveFatorUnidadeVitrineCompra,
  resolveLoteCompraBase,
  resolveLoteCompraVitrine,
} from '@/lib/calcularMetasEstoqueVendas';

export {
  arredondarQuantidadeSugestao,
  calcularMediaVendaDia,
  resolveLoteCompraBase,
  resolveLoteCompraVitrine,
} from '@/lib/calcularMetasEstoqueVendas';

/**
 * Calcula sugestão completa para um SKU.
 */
export function calcularSugestaoCompraProduto(
  produto,
  pedidos90d,
  movimentacoesProduto = [],
  options = {},
) {
  const janelaDias = options.janelaDias ?? METAS_ESTOQUE_JANELA_DIAS;
  const leadTimePadrao = options.leadTimePadrao ?? METAS_ESTOQUE_LEAD_TIME_PADRAO;
  const roundingMode = options.roundingMode ?? 'auto';

  const leadTime = Math.max(1, Number(produto?.tempo_reposicao_dias) || leadTimePadrao);
  const estoqueAtual = Number(produto?.estoque_atual) || 0;

  const media = calcularMediaVendaDia(produto, pedidos90d, movimentacoesProduto, {
    janelaDias,
  });

  if (!media.teveMedia) {
    return {
      elegivel: false,
      motivo: 'sem_venda',
      lead_time_dias: leadTime,
      estoque_atual: estoqueAtual,
      ...media,
    };
  }

  const m = media.mediaDia;
  const pontoPedido = m * 1.5 * leadTime;
  const quantidadeBruta = m * leadTime;
  const quantidadeSugeridaBase = arredondarQuantidadeSugestao(
    quantidadeBruta,
    produto,
    roundingMode,
  );

  const elegivel = estoqueAtual < pontoPedido;

  const { unidade, fator } = resolveFatorUnidadeVitrineCompra(produto);
  const loteVitrine = resolveLoteCompraVitrine(produto);

  return {
    elegivel,
    motivo: elegivel ? 'abaixo_ponto_pedido' : 'estoque_suficiente',
    media_dia: m,
    ponto_pedido: pontoPedido,
    quantidade_bruta: quantidadeBruta,
    quantidade_sugerida_base: quantidadeSugeridaBase,
    lead_time_dias: leadTime,
    estoque_atual: estoqueAtual,
    estoque_minimo_calculado: arredondarQuantidadeSugestao(pontoPedido, produto, 'up'),
    estoque_ideal_calculado: quantidadeSugeridaBase,
    unidade_vitrine_compra: unidade,
    fator_vitrine: fator,
    lote_compra_vitrine: loteVitrine || null,
    lote_compra_base: resolveLoteCompraBase(produto),
    quantidade_limpa_90d: media.quantidadeLimpa,
    outliers_descartados: media.outliersDescartados,
    linhas_venda_total: media.linhasTotal,
    versao: 'v3-media-90d-lead-time',
  };
}
