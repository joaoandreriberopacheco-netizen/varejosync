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

/**
 * Estoque efetivo para exibição/cálculo quando o toggle «Incluir pedidos» está ligado.
 * Usa metadados da sugestão ou, em fallback, quantidade_pendente da linha.
 */
export function resolveSugestaoEstoqueEfetivoBase(produto = {}, sugestao = null, options = {}) {
  const incluir = options.incluirPedidosAprovados === true;
  const pendenteLinha = Number(options.quantidadePendente) || 0;
  const pedidosMeta = Number(sugestao?.estoque_pedidos_aprovados ?? produto?.estoque_pedidos_aprovados) || 0;
  const pedidos = pedidosMeta > 0 ? pedidosMeta : (incluir ? pendenteLinha : 0);
  const fisicoRaw = sugestao?.estoque_fisico ?? produto?.estoque_fisico;
  let fisico = Number.isFinite(Number(fisicoRaw)) ? Number(fisicoRaw) : null;
  let estoqueBase = Number(sugestao?.estoque_atual ?? produto?.estoque_atual) || 0;

  if (fisico == null && pedidos > 0) {
    fisico = estoqueBase;
  }

  if (incluir && pedidos > 0 && fisico != null) {
    const total = fisico + pedidos;
    if (estoqueBase < total - 1e-6) estoqueBase = total;
  }

  return { estoqueBase, fisico, pedidos };
}

/** Estoque na linha: com «Incluir pedidos» ligado, um único total (físico + pedidos). */
export function formatSugestaoEstoqueLinha(produto = {}, sugestao = null, options = {}) {
  const incluir = options.incluirPedidosAprovados === true;
  const { estoqueBase, fisico, pedidos } = resolveSugestaoEstoqueEfetivoBase(produto, sugestao, options);
  const primary = formatSugestaoQuantidadeVitrine(produto, estoqueBase) || '—';

  if (!incluir && pedidos > 0 && fisico != null) {
    const fisicoFmt = formatSugestaoQuantidadeVitrine(produto, fisico) || '0';
    const pedFmt = formatSugestaoQuantidadeVitrine(produto, pedidos) || '0';
    return {
      primary,
      secondary: `${fisicoFmt} + ${pedFmt} ped.`,
    };
  }

  return { primary, secondary: null };
}
