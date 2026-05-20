import { formatEstoqueApresentacao, getCatalogoComercialView } from '@/lib/productUnits';
import { calcCusto } from '@/components/produtos/treegrid/useTreeGrid';

/** Quantidade de estoque nos totais (vitrine comercial quando activa, senão unidade base). */
export function lineEstoqueQuantidade(produto) {
  const ap = formatEstoqueApresentacao(produto);
  return ap ? ap.quantidade : produto?.estoque_atual || 0;
}

/** estoque × valor de compra (alinha coluna Vl. Compra do TreeGrid). */
export function lineValorCompraTotal(produto) {
  const qtd = lineEstoqueQuantidade(produto);
  const ap = formatEstoqueApresentacao(produto);
  if (ap) {
    return qtd * getCatalogoComercialView(produto).valorCompraNaEmbalagem;
  }
  return qtd * (produto?.valor_compra || 0);
}

/** estoque × custo total (alinha coluna Custo Total / Inventário R$). */
export function lineValorCustoTotal(produto) {
  const qtd = lineEstoqueQuantidade(produto);
  const ap = formatEstoqueApresentacao(produto);
  if (ap) {
    return qtd * getCatalogoComercialView(produto).custoNaEmbalagem;
  }
  return qtd * calcCusto(produto);
}

/**
 * Totais do inventário filtrado (soma por SKU, sem duplicar grupos da árvore).
 * Com vitrine activa usa quantidade e preços da embalagem comercial; senão unidade base.
 */
export function sumCatalogStockTotals(produtos) {
  let totalCompra = 0;
  let totalCusto = 0;
  let count = 0;
  const list = Array.isArray(produtos) ? produtos : [];
  for (const p of list) {
    if (!p || typeof p !== 'object') continue;
    count += 1;
    totalCompra += lineValorCompraTotal(p);
    totalCusto += lineValorCustoTotal(p);
  }
  return {
    count,
    totalCompra,
    totalCusto,
  };
}
