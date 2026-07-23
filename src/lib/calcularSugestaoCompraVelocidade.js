/**
 * Sugestão de compra pela velocidade de giro (vendas 60d) e ponto futuro.
 * Alinha com a coluna «Média 30d» e «Ponto LT» do catálogo (média × 1,5 × lead time).
 */

import {
  aggregateCatalogPontoEsperadoLt,
  aggregateCatalogSalesVelocity,
  calcularMediaDiaVendas60dCalendario,
  formatCatalogMedia30d,
  formatCatalogPontoEsperadoLt,
  getCatalogLeadTimeDias,
  getCatalogMedia30dFrom60d,
  getCatalogPontoEsperadoLt,
} from '@/lib/catalogSalesVelocity';
import {
  arredondarQuantidadeSugestao,
  calcularPontoPedidoBase,
  calcularQuantidadeReposicaoBase,
  resolveFatorUnidadeVitrineCompra,
  resolveLoteCompraVitrine,
} from '@/lib/calcularMetasEstoqueVendas';
import { formatCatalogSalesQuantity } from '@/lib/catalogSalesVelocity';
import { formatQuantidadeCatalogoApresentacao } from '@/lib/productUnits';

function resolveLeadTime(produto, leadTimePadrao = 20) {
  return getCatalogLeadTimeDias(produto, leadTimePadrao);
}

function formatGapPontoFuturo(produto, gapBase) {
  const qty = Number(gapBase) || 0;
  if (qty <= 0) return null;
  const ap = formatQuantidadeCatalogoApresentacao(produto, qty);
  return formatCatalogSalesQuantity(ap.quantidade, ap.sigla, { dashIfZero: false });
}

function buildGapPontoFuturo(produto, pontoPedidoBase, estoqueAtual) {
  const gapBase = Math.max(0, (Number(pontoPedidoBase) || 0) - (Number(estoqueAtual) || 0));
  return {
    gap_ponto_futuro_base: gapBase,
    gap_ponto_futuro_texto: formatGapPontoFuturo(produto, gapBase),
  };
}

function buildMetricasVelocidade(produto, pedidos90d, salesVelocityMap, leadTime) {
  const prodId = String(produto?.id ?? '');
  const velocity = salesVelocityMap?.[prodId];
  const media = calcularMediaDiaVendas60dCalendario(produto, pedidos90d);
  const mediaDia = media.mediaDia || 0;
  const pontoPedido = calcularPontoPedidoBase(mediaDia, leadTime);
  const estoqueIdeal = calcularQuantidadeReposicaoBase(mediaDia, leadTime);

  return {
    media,
    velocity,
    mediaDia,
    media_30d_comercial: getCatalogMedia30dFrom60d(velocity),
    media_30d_texto: formatCatalogMedia30d(velocity) || null,
    ponto_futuro_comercial: getCatalogPontoEsperadoLt(velocity, leadTime),
    ponto_futuro_texto: formatCatalogPontoEsperadoLt(velocity, leadTime) || null,
    pontoPedido,
    estoqueIdeal,
  };
}

export function sugestaoTemGiroVelocidade(sugestao) {
  if (!sugestao) return false;
  return (Number(sugestao.media_dia) || 0) > 0 || (Number(sugestao.quantidade_limpa_60d) || 0) > 0;
}

export function calcularSugestaoCompraProdutoVelocidade(
  produto,
  pedidos90d = [],
  salesVelocityMap = {},
  options = {},
) {
  const roundingMode = options.roundingMode ?? 'auto';
  const leadTimePadrao = options.leadTimePadrao ?? 20;
  const fallbackCatalogo = options.fallbackCatalogo === true;
  const catalogoCompleto = options.catalogoCompleto === true;

  const estoqueAtual = Number(produto?.estoque_atual) || 0;
  const leadTime = resolveLeadTime(produto, leadTimePadrao);
  const metricas = buildMetricasVelocidade(produto, pedidos90d, salesVelocityMap, leadTime);
  const { unidade, fator } = resolveFatorUnidadeVitrineCompra(produto);

  if (!metricas.media.teveMedia) {
    if (fallbackCatalogo) {
      const pontoCadastro = Number(produto?.estoque_minimo) || 0;
      const idealCadastro = Number(produto?.estoque_ideal) || 0;
      if (pontoCadastro <= 0) {
        return {
          elegivel: false,
          motivo: 'sem_venda',
          lead_time_dias: leadTime,
          estoque_atual: estoqueAtual,
          fonte: 'velocidade',
        };
      }
      const elegivel = estoqueAtual < pontoCadastro;
      const quantidadeSugeridaBase = elegivel
        ? arredondarQuantidadeSugestao(
            idealCadastro > 0 ? idealCadastro : pontoCadastro,
            produto,
            roundingMode,
          )
        : 0;
      const { unidade, fator } = resolveFatorUnidadeVitrineCompra(produto);
      return {
        elegivel,
        motivo: elegivel ? 'abaixo_ponto_cadastro' : 'estoque_suficiente',
        ponto_pedido: pontoCadastro,
        estoque_ideal: idealCadastro,
        quantidade_sugerida_base: quantidadeSugeridaBase,
        lead_time_dias: leadTime,
        estoque_atual: estoqueAtual,
        media_30d_texto: null,
        ponto_futuro_texto: null,
        unidade_vitrine_compra: unidade,
        fator_vitrine: fator,
        lote_compra_vitrine: resolveLoteCompraVitrine(produto) || null,
        fonte: 'velocidade',
        fallback_cadastro: true,
        versao: 'v1-velocidade-fallback-catalogo',
      };
    }

    if (catalogoCompleto) {
      return {
        elegivel: true,
        motivo: 'sem_venda',
        lead_time_dias: leadTime,
        estoque_atual: estoqueAtual,
        media_30d_texto: metricas.media_30d_texto,
        ponto_futuro_texto: null,
        gap_ponto_futuro_base: 0,
        gap_ponto_futuro_texto: null,
        quantidade_sugerida_base: 0,
        ponto_pedido: 0,
        unidade_vitrine_compra: unidade,
        fator_vitrine: fator,
        lote_compra_vitrine: resolveLoteCompraVitrine(produto) || null,
        fonte: 'velocidade',
        catalogo_completo: true,
      };
    }

    return {
      elegivel: false,
      motivo: 'sem_venda',
      lead_time_dias: leadTime,
      estoque_atual: estoqueAtual,
      media_30d_texto: metricas.media_30d_texto,
      ponto_futuro_texto: metricas.ponto_futuro_texto,
      fonte: 'velocidade',
    };
  }

  const { pontoPedido, estoqueIdeal } = metricas;
  const gap = buildGapPontoFuturo(produto, pontoPedido, estoqueAtual);
  const elegivel = catalogoCompleto ? gap.gap_ponto_futuro_base > 0 : estoqueAtual < pontoPedido;
  const quantidadeSugeridaBase = catalogoCompleto
    ? gap.gap_ponto_futuro_base > 0
      ? arredondarQuantidadeSugestao(gap.gap_ponto_futuro_base, produto, roundingMode)
      : 0
    : elegivel
      ? arredondarQuantidadeSugestao(estoqueIdeal, produto, roundingMode)
      : 0;

  return {
    elegivel: catalogoCompleto ? true : elegivel,
    motivo: catalogoCompleto
      ? gap.gap_ponto_futuro_base > 0
        ? 'abaixo_ponto_futuro'
        : 'estoque_suficiente'
      : elegivel
        ? 'abaixo_ponto_futuro'
        : 'estoque_suficiente',
    media_dia: metricas.mediaDia,
    ponto_pedido: pontoPedido,
    estoque_ideal: estoqueIdeal,
    quantidade_sugerida_base: quantidadeSugeridaBase,
    lead_time_dias: leadTime,
    estoque_atual: estoqueAtual,
    media_30d_comercial: metricas.media_30d_comercial,
    media_30d_texto: metricas.media_30d_texto,
    ponto_futuro_comercial: metricas.ponto_futuro_comercial,
    ponto_futuro_texto: metricas.ponto_futuro_texto,
    ...gap,
    quantidade_limpa_60d: metricas.media.quantidade_limpa_60d,
    unidade_vitrine_compra: unidade,
    fator_vitrine: fator,
    lote_compra_vitrine: resolveLoteCompraVitrine(produto) || null,
    fonte: 'velocidade',
    catalogo_completo: catalogoCompleto || undefined,
    versao: catalogoCompleto
      ? 'v2-catalogo-completo-gap'
      : 'v1-velocidade-60d-ponto-futuro',
  };
}

export function calcularSugestaoCompraGrupoVelocidade(
  skus,
  pedidos90d = [],
  salesVelocityMap = {},
  options = {},
) {
  const lista = (skus || []).filter(Boolean);
  if (!lista.length) {
    return { elegivel: false, motivo: 'grupo_vazio', fonte: 'velocidade' };
  }
  if (lista.length === 1) {
    return calcularSugestaoCompraProdutoVelocidade(lista[0], pedidos90d, salesVelocityMap, options);
  }

  const roundingMode = options.roundingMode ?? 'auto';
  const leadTimePadrao = options.leadTimePadrao ?? 20;
  const catalogoCompleto = options.catalogoCompleto === true;

  const sugestoes = lista.map((p) =>
    calcularSugestaoCompraProdutoVelocidade(p, pedidos90d, salesVelocityMap, {
      ...options,
      fallbackCatalogo: false,
      catalogoCompleto,
    }),
  );

  const comVenda = sugestoes.filter((s) => s.media_dia > 0 || s.quantidade_limpa_60d > 0);
  const usarFallbackGrupo = comVenda.length === 0 && options.fallbackCatalogo === true;

  if (usarFallbackGrupo) {
    const estoqueAtual = lista.reduce((s, p) => s + (Number(p.estoque_atual) || 0), 0);
    const pontoPedido = lista.reduce((s, p) => s + (Number(p.estoque_minimo) || 0), 0);
    const estoqueIdeal = lista.reduce((s, p) => s + (Number(p.estoque_ideal) || 0), 0);
    const leadTime = Math.max(...lista.map((p) => resolveLeadTime(p, leadTimePadrao)));
    const representativo = lista.find((p) => (Number(p.estoque_minimo) || 0) > 0) || lista[0];

    if (pontoPedido <= 0) {
      return {
        elegivel: false,
        motivo: 'sem_venda',
        lead_time_dias: leadTime,
        estoque_atual: estoqueAtual,
        skus_no_grupo: lista.length,
        agrupado: true,
        fonte: 'velocidade',
      };
    }

    const elegivel = estoqueAtual < pontoPedido;
    const quantidadeSugeridaBase = elegivel
      ? arredondarQuantidadeSugestao(
          estoqueIdeal > 0 ? estoqueIdeal : pontoPedido,
          representativo,
          roundingMode,
        )
      : 0;
    const { unidade, fator } = resolveFatorUnidadeVitrineCompra(representativo);

    return {
      elegivel,
      motivo: elegivel ? 'abaixo_ponto_cadastro' : 'estoque_suficiente',
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
      fonte: 'velocidade',
      fallback_cadastro: true,
      versao: 'v1-grupo-velocidade-fallback-catalogo',
    };
  }

  const estoqueAtual = lista.reduce((s, p) => s + (Number(p.estoque_atual) || 0), 0);
  const pontoPedido = comVenda.reduce((s, sg) => s + (Number(sg.ponto_pedido) || 0), 0);
  const estoqueIdeal = comVenda.reduce((s, sg) => s + (Number(sg.estoque_ideal) || 0), 0);
  const leadTime = Math.max(...lista.map((p) => resolveLeadTime(p, leadTimePadrao)));
  const representativo =
    lista.find((p) => p.id === comVenda[0]?.produto_representativo_id) ||
    lista.find((p) => (Number(p.estoque_atual) || 0) > 0) ||
    lista[0];

  if (pontoPedido <= 0 && !catalogoCompleto) {
    return {
      elegivel: false,
      motivo: 'sem_venda',
      lead_time_dias: leadTime,
      estoque_atual: estoqueAtual,
      skus_no_grupo: lista.length,
      agrupado: true,
      fonte: 'velocidade',
    };
  }

  const gap = buildGapPontoFuturo(representativo, pontoPedido, estoqueAtual);
  const elegivel = catalogoCompleto ? gap.gap_ponto_futuro_base > 0 : estoqueAtual < pontoPedido;
  const quantidadeSugeridaBase = catalogoCompleto
    ? gap.gap_ponto_futuro_base > 0
      ? arredondarQuantidadeSugestao(gap.gap_ponto_futuro_base, representativo, roundingMode)
      : 0
    : elegivel
      ? arredondarQuantidadeSugestao(estoqueIdeal, representativo, roundingMode)
      : 0;

  const velocityAgg = aggregateCatalogSalesVelocity(lista, salesVelocityMap);
  const pontoAgg = aggregateCatalogPontoEsperadoLt(lista, salesVelocityMap, leadTimePadrao);
  const { unidade, fator } = resolveFatorUnidadeVitrineCompra(representativo);

  if (catalogoCompleto && pontoPedido <= 0) {
    return {
      elegivel: true,
      motivo: 'sem_venda',
      lead_time_dias: leadTime,
      estoque_atual: estoqueAtual,
      media_30d_texto: formatCatalogMedia30d(velocityAgg, { tilde: true }) || null,
      ponto_futuro_texto: null,
      gap_ponto_futuro_base: 0,
      gap_ponto_futuro_texto: null,
      quantidade_sugerida_base: 0,
      ponto_pedido: 0,
      produto_representativo_id: representativo.id,
      unidade_vitrine_compra: unidade,
      fator_vitrine: fator,
      skus_no_grupo: lista.length,
      agrupado: true,
      fonte: 'velocidade',
      catalogo_completo: true,
    };
  }

  return {
    elegivel: catalogoCompleto ? true : elegivel,
    motivo: catalogoCompleto
      ? gap.gap_ponto_futuro_base > 0
        ? 'abaixo_ponto_futuro'
        : 'estoque_suficiente'
      : elegivel
        ? 'abaixo_ponto_futuro'
        : 'estoque_suficiente',
    ponto_pedido: pontoPedido,
    estoque_ideal: estoqueIdeal,
    quantidade_sugerida_base: quantidadeSugeridaBase,
    lead_time_dias: leadTime,
    estoque_atual: estoqueAtual,
    media_30d_comercial: getCatalogMedia30dFrom60d(velocityAgg),
    media_30d_texto: formatCatalogMedia30d(velocityAgg, { tilde: true }) || null,
    ponto_futuro_comercial: pontoAgg.quantidade,
    ponto_futuro_texto: pontoAgg.quantidade > 0 && pontoAgg.unidade
      ? `${pontoAgg.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${pontoAgg.unidade}`
      : null,
    ...gap,
    produto_representativo_id: representativo.id,
    unidade_vitrine_compra: unidade,
    fator_vitrine: fator,
    skus_no_grupo: lista.length,
    agrupado: true,
    fonte: 'velocidade',
    catalogo_completo: catalogoCompleto || undefined,
    versao: catalogoCompleto
      ? 'v2-grupo-catalogo-completo-gap'
      : 'v1-grupo-velocidade-60d-ponto-futuro',
  };
}
