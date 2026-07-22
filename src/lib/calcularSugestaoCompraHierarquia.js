/**
 * Sugestões de compra agregadas por hierarquia (h1–h4).
 * h5 / modelo fica dentro do grupo — ex.: «200 CX» de piso 45×45 sem escolher marca.
 */

import { collectItensVendaProduto, lineQuantityBase } from '@/lib/calcularIepProdutos';
import {
  METAS_ESTOQUE_JANELA_DIAS,
  METAS_ESTOQUE_LEAD_TIME_PADRAO,
  arredondarQuantidadeSugestao,
  calcularPontoPedidoBase,
  calcularQuantidadeReposicaoBase,
  calcularVendasSemOutliersQuantidade,
  resolveFatorUnidadeVitrineCompra,
} from '@/lib/calcularMetasEstoqueVendas';
import { calcularSugestaoCompraProduto } from '@/lib/calcularSugestaoCompra';
import {
  buildMapaSaldoFimDia,
  contarDiasComEstoqueAtivo,
  iterarDiasCalendario,
} from '@/lib/estoqueSaldoDiario';

function q3(values) {
  if (!values || values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = Math.ceil(sorted.length * 0.75) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

/** Chave do grupo de compra (h1…h4; exige nível 2). */
export function grupoCompraHierarquiaKey(produto) {
  const h1 = String(produto?.campo_hierarquico_1 || '').trim();
  const h2 = String(produto?.campo_hierarquico_2 || '').trim();
  if (!h2) return null;
  const h3 = String(produto?.campo_hierarquico_3 || '').trim();
  const h4 = String(produto?.campo_hierarquico_4 || '').trim();
  const parts = [h1 || '(sem grupo)', h2];
  if (h3) parts.push(h3);
  if (h4) parts.push(h4);
  return parts.join('\x00');
}

export function grupoCompraHierarquiaLabel(produto) {
  const h1 = String(produto?.campo_hierarquico_1 || '').trim();
  const h2 = String(produto?.campo_hierarquico_2 || '').trim();
  const h3 = String(produto?.campo_hierarquico_3 || '').trim();
  const h4 = String(produto?.campo_hierarquico_4 || '').trim();
  const parts = [];
  if (h1) parts.push(h1);
  if (h2) parts.push(h2);
  if (h3) parts.push(h3);
  if (h4) parts.push(h4);
  return parts.join(' › ') || produto?.nome || 'Grupo';
}

export function agruparSkusPorHierarquiaCompra(produtos) {
  const map = new Map();
  const soltos = [];

  for (const p of produtos || []) {
    const key = grupoCompraHierarquiaKey(p);
    if (!key) {
      soltos.push(p);
      continue;
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }

  return { map, soltos };
}

function calcularVendasSemOutliersGrupo(skus, pedidos90d) {
  const quantidades = [];
  for (const produto of skus) {
    const itens = collectItensVendaProduto(produto, pedidos90d);
    for (const it of itens) {
      const q = lineQuantityBase(it);
      if (q > 0) quantidades.push(q);
    }
  }

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

function buildMapaSaldoFimDiaGrupo(skus, movsPorProduto, janelaDias = METAS_ESTOQUE_JANELA_DIAS) {
  if (!skus?.length) return new Map();

  const mapas = skus.map((p) =>
    buildMapaSaldoFimDia(movsPorProduto[p.id] || [], p.estoque_atual, janelaDias),
  );

  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - janelaDias);
  const dias = iterarDiasCalendario(inicio, hoje);

  const combined = new Map();
  for (const dia of dias) {
    let sum = 0;
    for (const m of mapas) {
      sum += m.get(dia) ?? 0;
    }
    combined.set(dia, sum);
  }
  return combined;
}

function escolherProdutoRepresentativo(skus, pedidos90d) {
  let best = skus[0];
  let bestV = -1;
  for (const p of skus) {
    const withLote = Number(p.lote_compra_vitrine) > 1;
    const v = calcularVendasSemOutliersQuantidade(p, pedidos90d).quantidadeLimpa;
    if (withLote && v >= bestV) {
      best = p;
      bestV = v;
    } else if (v > bestV) {
      best = p;
      bestV = v;
    }
  }
  return best;
}

function resolveLeadTimeGrupo(skus, leadTimePadrao) {
  let lt = leadTimePadrao;
  for (const p of skus) {
    const v = Number(p?.tempo_reposicao_dias);
    if (v > 0) lt = Math.max(lt, v);
  }
  return Math.max(1, lt);
}

/**
 * Sugestão agregada para família (vários SKUs, mesmo h1–h4).
 */
export function calcularSugestaoCompraGrupo(
  skus,
  pedidos90d,
  movsPorProduto,
  options = {},
) {
  const janelaDias = options.janelaDias ?? METAS_ESTOQUE_JANELA_DIAS;
  const leadTimePadrao = options.leadTimePadrao ?? METAS_ESTOQUE_LEAD_TIME_PADRAO;
  const roundingMode = options.roundingMode ?? 'auto';

  const lista = (skus || []).filter(Boolean);
  if (lista.length === 0) {
    return { elegivel: false, motivo: 'grupo_vazio' };
  }

  if (lista.length === 1) {
    return calcularSugestaoCompraProduto(
      lista[0],
      pedidos90d,
      movsPorProduto[lista[0].id] || [],
      options,
    );
  }

  const representativo = escolherProdutoRepresentativo(lista, pedidos90d);
  const leadTime = resolveLeadTimeGrupo(lista, leadTimePadrao);
  const estoqueAtual = lista.reduce((s, p) => s + (Number(p.estoque_atual) || 0), 0);

  const vendas = calcularVendasSemOutliersGrupo(lista, pedidos90d);
  const saldoPorDia = buildMapaSaldoFimDiaGrupo(lista, movsPorProduto, janelaDias);
  const diasComEstoque = contarDiasComEstoqueAtivo(saldoPorDia);

  if (!vendas.teveVenda || diasComEstoque === 0) {
    return {
      elegivel: false,
      motivo: !vendas.teveVenda ? 'sem_venda' : 'sem_dias_com_estoque',
      lead_time_dias: leadTime,
      estoque_atual: estoqueAtual,
      dias_com_estoque: diasComEstoque,
      quantidade_limpa_90d: vendas.quantidadeLimpa,
      skus_no_grupo: lista.length,
      agrupado: true,
    };
  }

  const m = vendas.quantidadeLimpa / diasComEstoque;
  const pontoPedido = calcularPontoPedidoBase(m, leadTime);
  const quantidadeBruta = calcularQuantidadeReposicaoBase(m, leadTime);
  const quantidadeSugeridaBase = arredondarQuantidadeSugestao(
    quantidadeBruta,
    representativo,
    roundingMode,
  );

  const elegivel = estoqueAtual < pontoPedido;
  const { unidade, fator } = resolveFatorUnidadeVitrineCompra(representativo);

  return {
    elegivel,
    motivo: elegivel ? 'abaixo_ponto_pedido' : 'estoque_suficiente',
    media_dia: m,
    ponto_pedido: pontoPedido,
    quantidade_bruta: quantidadeBruta,
    quantidade_sugerida_base: quantidadeSugeridaBase,
    lead_time_dias: leadTime,
    estoque_atual: estoqueAtual,
    produto_representativo_id: representativo.id,
    unidade_vitrine_compra: unidade,
    fator_vitrine: fator,
    dias_com_estoque: diasComEstoque,
    quantidade_limpa_90d: vendas.quantidadeLimpa,
    outliers_descartados: vendas.outliersDescartados,
    linhas_venda_total: vendas.linhasTotal,
    skus_no_grupo: lista.length,
    agrupado: true,
    versao: 'v3-grupo-ponto-pedido-media-lead-time',
  };
}

/**
 * Divide quantidade do grupo entre SKUs pela participação nas vendas 90d.
 */
export function distribuirQuantidadeGrupo(skus, quantidadeTotalBase, pedidos90d, roundingMode = 'auto') {
  const lista = skus || [];
  if (!lista.length) return [];

  const vendasPorSku = lista.map((p) => ({
    produto: p,
    qty: calcularVendasSemOutliersQuantidade(p, pedidos90d).quantidadeLimpa,
  }));
  const totalVendas = vendasPorSku.reduce((s, x) => s + x.qty, 0);

  if (totalVendas <= 0) {
    const each = quantidadeTotalBase / lista.length;
    return vendasPorSku.map(({ produto }) => ({
      produto,
      quantidade_base: arredondarQuantidadeSugestao(each, produto, roundingMode),
    }));
  }

  let restante = quantidadeTotalBase;
  const out = vendasPorSku.map(({ produto, qty }, idx) => {
    const share = idx === vendasPorSku.length - 1
      ? restante
      : (quantidadeTotalBase * qty) / totalVendas;
    const rounded = arredondarQuantidadeSugestao(share, produto, roundingMode);
    restante -= rounded;
    return { produto, quantidade_base: Math.max(0, rounded) };
  });

  if (restante > 0) {
    const top = out.reduce((a, b) => (b.quantidade_base > a.quantidade_base ? b : a), out[0]);
    if (top) top.quantidade_base += restante;
  }

  return out.filter((x) => x.quantidade_base > 0);
}

/**
 * Monta linhas de exibição (grupo ou SKU avulso).
 */
export function buildLinhasSugestaoCompra(
  produtosAtivos,
  pedidos90d,
  movsPorProduto,
  pendingPorProduto = {},
  options = {},
) {
  const agrupar = options.agruparHierarquia !== false;
  const roundingMode = options.roundingMode ?? 'auto';
  const { map, soltos } = agruparSkusPorHierarquiaCompra(produtosAtivos);

  const linhas = [];
  const skusEmGrupo = new Set();

  if (agrupar) {
    for (const [key, skus] of map.entries()) {
      if (skus.length < 2) {
        soltos.push(skus[0]);
        continue;
      }

      skus.forEach((p) => skusEmGrupo.add(p.id));
      const sugestao = calcularSugestaoCompraGrupo(skus, pedidos90d, movsPorProduto, {
        roundingMode,
      });
      if (!sugestao.elegivel) continue;

      const representativo =
        skus.find((p) => p.id === sugestao.produto_representativo_id) || skus[0];
      const pendente = skus.reduce((s, p) => s + (pendingPorProduto[p.id] || 0), 0);

      linhas.push({
        tipo: 'grupo',
        id: `grupo:${key}`,
        label: grupoCompraHierarquiaLabel(representativo),
        skus,
        produto: representativo,
        sugestao,
        quantidade_pendente: pendente,
        searchText: [grupoCompraHierarquiaLabel(representativo), ...skus.map((p) => p.nome)]
          .join(' ')
          .toLowerCase(),
      });
    }
  } else {
    for (const skus of map.values()) soltos.push(...skus);
  }

  for (const p of soltos) {
    if (agrupar && skusEmGrupo.has(p.id)) continue;
    const sugestao = calcularSugestaoCompraProduto(
      p,
      pedidos90d,
      movsPorProduto[p.id] || [],
      { roundingMode },
    );
    if (!sugestao.elegivel) continue;

    linhas.push({
      tipo: 'sku',
      id: p.id,
      label: p.nome,
      skus: [p],
      produto: p,
      sugestao,
      quantidade_pendente: pendingPorProduto[p.id] || 0,
      searchText: (p.nome || '').toLowerCase(),
    });
  }

  linhas.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  return linhas;
}
