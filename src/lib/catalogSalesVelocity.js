import {
  formatEstoqueApresentacao,
  resolveCommercialDisplay,
} from '@/lib/productUnits';

const DIAS_MEDIA = 30;

/** Mesma regra de elegibilidade do catálogo ABCD (sem importar calcularIepProdutos). */
function pedidoElegivelVendas(pedido) {
  const status = String(pedido?.status ?? '');
  if (status === 'Cancelado') return false;
  const tipo = String(pedido?.tipo ?? 'PDV').trim().toUpperCase();
  if (tipo === 'PEDIDO') return true;
  if (tipo === 'PDV' || tipo.startsWith('PDV ')) return true;
  return false;
}

function lineQuantityBaseVendas(item) {
  const qtyBase = item?.quantidade_base;
  if (qtyBase != null && Number.isFinite(Number(qtyBase)) && Number(qtyBase) > 0) {
    return Number(qtyBase) || 0;
  }
  const qty = Number(item?.quantidade ?? item?.quantidade_comercial ?? item?.qtd) || 0;
  const fator = Number(item?.fator_conversao ?? item?.fator_aplicado) || 1;
  return qty * fator;
}

function resolveSkuUnidade(produto) {
  const apresent = formatEstoqueApresentacao(produto);
  if (apresent?.sigla) return apresent.sigla;
  return String(produto?.unidade_principal || 'UN').trim().toUpperCase() || 'UN';
}

function emptyVelocity(produto) {
  return {
    qtd30: 0,
    qtd60: 0,
    unidade: resolveSkuUnidade(produto),
  };
}

/**
 * Agrega quantidades vendidas por SKU em janelas de 30 e 60 dias.
 * Usa unidade comercial (mesma regra do Relatório de Margem).
 */
export function buildCatalogSalesVelocityMap(produtos = [], pedidos = []) {
  const prodMap = Object.fromEntries(
    (produtos || [])
      .filter((p) => p?.id != null)
      .map((p) => [String(p.id), p]),
  );
  const map = {};

  const now = new Date();
  const cut30 = new Date(now);
  cut30.setDate(cut30.getDate() - 30);
  const cut60 = new Date(now);
  cut60.setDate(cut60.getDate() - 60);

  for (const pedido of pedidos || []) {
    if (!pedidoElegivelVendas(pedido)) continue;

    const rawDate = pedido?.created_date ?? pedido?.created_at;
    if (!rawDate) continue;
    const saleDate = new Date(rawDate);
    if (Number.isNaN(saleDate.getTime())) continue;

    const in60 = saleDate >= cut60;
    if (!in60) continue;
    const in30 = saleDate >= cut30;

    for (const item of pedido.itens || []) {
      const prodId = String(item?.produto_id ?? item?.produtoId ?? '');
      const product = prodMap[prodId];
      if (!product) continue;

      const qtyBase = lineQuantityBaseVendas(item);
      const resolved = resolveCommercialDisplay(
        product,
        qtyBase,
        item.unidade_medida || product.unidade_principal || 'UN',
      );

      if (!map[prodId]) {
        map[prodId] = emptyVelocity(product);
      }

      map[prodId].qtd60 += resolved.quantidade || 0;
      if (in30) map[prodId].qtd30 += resolved.quantidade || 0;
      map[prodId].unidade = resolved.unidade || map[prodId].unidade;
    }
  }

  for (const produto of produtos || []) {
    const id = String(produto?.id ?? '');
    if (!id) continue;
    if (!map[id]) map[id] = emptyVelocity(produto);
  }

  return map;
}

/** Soma velocidade de vendas para linhas de grupo (mesma unidade ou travessão). */
export function aggregateCatalogSalesVelocity(skus = [], velocityMap = {}) {
  if (!skus?.length) {
    return { qtd30: 0, qtd60: 0, unidade: null };
  }

  let qtd30 = 0;
  let qtd60 = 0;
  const units = new Set();

  for (const sku of skus) {
    const v = velocityMap[String(sku?.id)] || emptyVelocity(sku);
    qtd30 += v.qtd30 || 0;
    qtd60 += v.qtd60 || 0;
    if (v.unidade) units.add(String(v.unidade).trim().toUpperCase());
  }

  return {
    qtd30,
    qtd60,
    unidade: units.size === 1 ? [...units][0] : null,
  };
}

export { DIAS_MEDIA };

/** Projeção de 30 dias a partir da média diária dos últimos 60 dias: (qtd60 / 60) × 30. */
export function getCatalogMedia30dFrom60d(velocity) {
  const qtd60 = Number(velocity?.qtd60) || 0;
  return qtd60 / 2;
}

export function formatCatalogSalesQuantity(qty, unidade, { tilde = false, dashIfZero = true } = {}) {
  const n = Number(qty) || 0;
  if (dashIfZero && n <= 0) return null;
  const formatted = n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const prefix = tilde ? '~' : '';
  if (unidade) return `${prefix}${formatted} ${unidade}`;
  return `${prefix}${formatted}`;
}

/** Texto da coluna «Média 30d» (média dos últimos 60d projetada em 30d). */
export function formatCatalogMedia30d(velocity, options = {}) {
  return formatCatalogSalesQuantity(
    getCatalogMedia30dFrom60d(velocity),
    velocity?.unidade,
    options,
  );
}

export const CATALOG_SALES_WINDOW_LABELS = {
  '30d': 'vendas nos últimos 30 dias',
  '60d': 'vendas nos últimos 60 dias',
};

export function normalizeCatalogSalesWindow(window) {
  return window === '30d' ? '30d' : '60d';
}

export function getCatalogSalesQty(velocity, window = '60d') {
  if (!velocity) return 0;
  const w = normalizeCatalogSalesWindow(window);
  return Number(w === '30d' ? velocity.qtd30 : velocity.qtd60) || 0;
}

/** Produto entrou no relatório só se teve quantidade vendida > 0 na janela. */
export function produtoTeveVendaNaJanela(velocity, window = '60d') {
  return getCatalogSalesQty(velocity, window) > 0;
}

export function filterProdutosComVendasNaJanela(produtos, velocityMap, window = '60d') {
  const w = normalizeCatalogSalesWindow(window);
  return (produtos || []).filter((p) => {
    if (!p?.id) return false;
    return produtoTeveVendaNaJanela(velocityMap[String(p.id)], w);
  });
}

/** Inclusão no relatório unificado 30+60d: vendeu em qualquer uma das janelas. */
export function produtoTeveVenda30ou60d(velocity) {
  return produtoTeveVendaNaJanela(velocity, '30d') || produtoTeveVendaNaJanela(velocity, '60d');
}

export function filterProdutosComVendas30ou60d(produtos, velocityMap) {
  return (produtos || []).filter((p) => {
    if (!p?.id) return false;
    return produtoTeveVenda30ou60d(velocityMap[String(p.id)]);
  });
}

/** Estoque comercial > 0 (mesma ideia do atalho «somente positivos» do catálogo). */
export function produtoTemEstoquePositivo(produto) {
  return (Number(produto?.estoque_atual) || 0) > 0;
}

/**
 * Critério do relatório v2: entra se teve venda em 30/60d OU tem estoque > 0.
 * Os filtros do catálogo (categoria, busca, etc.) aplicam-se antes, na lista recebida.
 */
export function produtoIncluirRelatorioVendasV2(produto, velocity) {
  return produtoTeveVenda30ou60d(velocity) || produtoTemEstoquePositivo(produto);
}

export function filterProdutosRelatorioVendasV2(produtos, velocityMap) {
  return (produtos || []).filter((p) => {
    if (!p?.id) return false;
    return produtoIncluirRelatorioVendasV2(p, velocityMap[String(p.id)]);
  });
}
