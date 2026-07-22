/**
 * Sugestão de compra lendo ponto de pedido e quantidade do cadastro (catálogo).
 * O job de metas grava estoque_minimo (ponto) e estoque_ideal (qtd a repor).
 */

import {
  arredondarQuantidadeSugestao,
  resolveFatorUnidadeVitrineCompra,
  resolveLoteCompraVitrine,
} from '@/lib/calcularMetasEstoqueVendas';

function resolveLeadTime(produto, leadTimePadrao = 20) {
  return Math.max(1, Number(produto?.tempo_reposicao_dias) || leadTimePadrao);
}

function resolveQuantidadeSugerida(produto, estoqueAtual, pontoPedido, estoqueIdeal, roundingMode) {
  const ideal = Number(estoqueIdeal) || 0;
  const pedido = Number(pontoPedido) || 0;
  const base = ideal > 0 ? ideal : pedido;
  if (base <= 0) return 0;
  return arredondarQuantidadeSugestao(base, produto, roundingMode);
}

export function calcularSugestaoCompraProdutoCatalogo(produto, options = {}) {
  const roundingMode = options.roundingMode ?? 'auto';
  const leadTimePadrao = options.leadTimePadrao ?? 20;

  const estoqueAtual = Number(produto?.estoque_atual) || 0;
  const pontoPedido = Number(produto?.estoque_minimo) || 0;
  const estoqueIdeal = Number(produto?.estoque_ideal) || 0;
  const leadTime = resolveLeadTime(produto, leadTimePadrao);

  if (pontoPedido <= 0) {
    return {
      elegivel: false,
      motivo: 'sem_ponto_pedido',
      lead_time_dias: leadTime,
      estoque_atual: estoqueAtual,
      ponto_pedido: pontoPedido,
      estoque_ideal: estoqueIdeal,
      fonte: 'catalogo',
    };
  }

  const elegivel = estoqueAtual < pontoPedido;
  const quantidadeSugeridaBase = elegivel
    ? resolveQuantidadeSugerida(produto, estoqueAtual, pontoPedido, estoqueIdeal, roundingMode)
    : 0;

  const { unidade, fator } = resolveFatorUnidadeVitrineCompra(produto);
  const loteVitrine = resolveLoteCompraVitrine(produto);

  return {
    elegivel,
    motivo: elegivel ? 'abaixo_ponto_pedido' : 'estoque_suficiente',
    ponto_pedido: pontoPedido,
    estoque_ideal: estoqueIdeal,
    quantidade_sugerida_base: quantidadeSugeridaBase,
    lead_time_dias: leadTime,
    estoque_atual: estoqueAtual,
    venda_media_dia: Number(produto?.venda_media_dia) || null,
    unidade_vitrine_compra: unidade,
    fator_vitrine: fator,
    lote_compra_vitrine: loteVitrine || null,
    fonte: 'catalogo',
    versao: 'v1-leitura-catalogo',
  };
}

export function calcularSugestaoCompraGrupoCatalogo(skus, options = {}) {
  const lista = (skus || []).filter(Boolean);
  if (!lista.length) {
    return { elegivel: false, motivo: 'grupo_vazio', fonte: 'catalogo' };
  }
  if (lista.length === 1) {
    return calcularSugestaoCompraProdutoCatalogo(lista[0], options);
  }

  const estoqueAtual = lista.reduce((s, p) => s + (Number(p.estoque_atual) || 0), 0);
  const pontoPedido = lista.reduce((s, p) => s + (Number(p.estoque_minimo) || 0), 0);
  const estoqueIdeal = lista.reduce((s, p) => s + (Number(p.estoque_ideal) || 0), 0);
  const leadTime = Math.max(...lista.map((p) => resolveLeadTime(p, options.leadTimePadrao ?? 20)));
  const representativo =
    lista.find((p) => (Number(p.estoque_minimo) || 0) > 0) || lista[0];

  if (pontoPedido <= 0) {
    return {
      elegivel: false,
      motivo: 'sem_ponto_pedido',
      lead_time_dias: leadTime,
      estoque_atual: estoqueAtual,
      ponto_pedido: pontoPedido,
      estoque_ideal: estoqueIdeal,
      skus_no_grupo: lista.length,
      agrupado: true,
      fonte: 'catalogo',
    };
  }

  const elegivel = estoqueAtual < pontoPedido;
  const quantidadeSugeridaBase = elegivel
    ? resolveQuantidadeSugerida(
        representativo,
        estoqueAtual,
        pontoPedido,
        estoqueIdeal,
        options.roundingMode ?? 'auto',
      )
    : 0;

  const { unidade, fator } = resolveFatorUnidadeVitrineCompra(representativo);

  return {
    elegivel,
    motivo: elegivel ? 'abaixo_ponto_pedido' : 'estoque_suficiente',
    ponto_pedido: pontoPedido,
    estoque_ideal: estoqueIdeal,
    quantidade_sugerida_base: quantidadeSugeridaBase,
    lead_time_dias: leadTime,
    estoque_atual: estoqueAtual,
    produto_representativo_id: representativo.id,
    unidade_vitrine_compra: unidade,
    fator_vitrine: fator,
    skus_no_grupo: lista.length,
    agrupado: true,
    fonte: 'catalogo',
    versao: 'v1-grupo-leitura-catalogo',
  };
}
