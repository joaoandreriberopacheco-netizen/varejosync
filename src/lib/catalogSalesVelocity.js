import {
  formatEstoqueApresentacao,
  resolveCommercialDisplay,
} from '@/lib/productUnits';

const DIAS_MEDIA = 30;

/** Evita puxar `calcularIepProdutos` para o chunk do useP38Entities no bundle do PDF. */
function pedidoElegivelVendas(pedido) {
  const status = String(pedido?.status ?? '');
  if (status === 'Cancelado') return false;
  const tipo = String(pedido?.tipo ?? 'PDV').toUpperCase();
  return tipo === 'PDV' || tipo === 'PEDIDO';
}

function lineQuantityBaseVendas(item) {
  const qtyBase = item?.quantidade_base;
  if (qtyBase != null && Number.isFinite(Number(qtyBase))) {
    return Number(qtyBase) || 0;
  }
  return Number(item?.quantidade ?? item?.qtd ?? 0) || 0;
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
