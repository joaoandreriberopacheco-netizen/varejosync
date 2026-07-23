import { formatCatalogSalesQuantity } from '@/lib/catalogSalesVelocity';
import { buildSnapshotExibicaoComercial, resolveCommercialDisplay } from '@/lib/productUnits';

export function produtoSnapshotVitrineCompra(produto = {}) {
  return buildSnapshotExibicaoComercial(produto);
}

/** Converte quantidade base → unidade de vitrine de compra. */
export function resolveSugestaoQuantidadeVitrine(produto = {}, quantidadeBase = 0) {
  const snap = produtoSnapshotVitrineCompra(produto);
  return resolveCommercialDisplay(
    snap,
    Number(quantidadeBase) || 0,
    produto?.unidade_principal || 'UN',
  );
}

export function formatSugestaoQuantidadeVitrine(produto = {}, quantidadeBase = 0, options = {}) {
  const disp = resolveSugestaoQuantidadeVitrine(produto, quantidadeBase);
  return formatCatalogSalesQuantity(disp.quantidade, disp.unidade, {
    dashIfZero: options.dashIfZero ?? false,
    tilde: options.tilde ?? false,
  });
}

/** Soma estoque dos SKUs sempre convertido para vitrine (como no catálogo). */
export function aggregateSugestaoEstoqueVitrine(skus = []) {
  if (!skus?.length) return { mode: 'empty', quantidade: 0 };

  const rows = skus.map((sku) => {
    const estoque = Number(sku?.estoque_atual) || 0;
    return resolveSugestaoQuantidadeVitrine(sku, estoque);
  });
  const quantidade = rows.reduce((sum, row) => sum + (Number(row.quantidade) || 0), 0);
  const units = [...new Set(rows.map((row) => row.unidade).filter(Boolean))];

  if (units.length === 1) {
    return { mode: 'vitrine', quantidade, sigla: units[0] };
  }
  if (units.length === 0) {
    return { mode: 'empty', quantidade: 0 };
  }
  return { mode: 'mixed', quantidade, siglas: units };
}

export function formatSugestaoAggregateEstoqueVitrine(agg) {
  if (!agg || agg.mode === 'empty') return null;
  if (agg.mode === 'mixed') {
    return {
      primary: Number(agg.quantidade || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }),
      secondary: 'mistura',
    };
  }
  const formatted = formatCatalogSalesQuantity(agg.quantidade, agg.sigla, { dashIfZero: false });
  return { primary: formatted || '—', secondary: null };
}
