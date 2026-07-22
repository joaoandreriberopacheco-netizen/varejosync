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

function resolveLeadTime(produto, leadTimePadrao = 20) {
  return getCatalogLeadTimeDias(produto, leadTimePadrao);
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

  const estoqueAtual = Number(produto?.estoque_atual) || 0;
  const leadTime = resolveLeadTime(produto, leadTimePadrao);
  const metricas = buildMetricasVelocidade(produto, pedidos90d, salesVelocityMap, leadTime);

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
  const elegivel = estoqueAtual < pontoPedido;
  const quantidadeSugeridaBase = elegivel
    ? arredondarQuantidadeSugestao(estoqueIdeal, produto, roundingMode)
    : 0;

  const { unidade, fator } = resolveFatorUnidadeVitrineCompra(produto);

  return {
    elegivel,
    motivo: elegivel ? 'abaixo_ponto_futuro' : 'estoque_suficiente',
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
    quantidade_limpa_60d: metricas.media.quantidade_limpa_60d,
    unidade_vitrine_compra: unidade,
    fator_vitrine: fator,
    lote_compra_vitrine: resolveLoteCompraVitrine(produto) || null,
    fonte: 'velocidade',
    versao: 'v1-velocidade-60d-ponto-futuro',
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

  const sugestoes = lista.map((p) =>
    calcularSugestaoCompraProdutoVelocidade(p, pedidos90d, salesVelocityMap, {
      ...options,
      fallbackCatalogo: false,
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
    ? arredondarQuantidadeSugestao(estoqueIdeal, representativo, roundingMode)
    : 0;

  const velocityAgg = aggregateCatalogSalesVelocity(lista, salesVelocityMap);
  const pontoAgg = aggregateCatalogPontoEsperadoLt(lista, salesVelocityMap, leadTimePadrao);
  const { unidade, fator } = resolveFatorUnidadeVitrineCompra(representativo);

  return {
    elegivel,
    motivo: elegivel ? 'abaixo_ponto_futuro' : 'estoque_suficiente',
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
    produto_representativo_id: representativo.id,
    unidade_vitrine_compra: unidade,
    fator_vitrine: fator,
    skus_no_grupo: lista.length,
    agrupado: true,
    fonte: 'velocidade',
    versao: 'v1-grupo-velocidade-60d-ponto-futuro',
  };
}
