import {
  buildTree,
  flattenTree,
  mergeAdjacentDuplicateGroupHeaders,
  buildExpandedForLevel,
} from '@/components/produtos/treegrid/useTreeGrid';

/**
 * Prepara linhas do relatório de estoque (árvore ou plana) com os mesmos dados da tela.
 */
export function prepareCatalogStockReportRows({
  produtos = [],
  layoutMode = 'tree',
  treeLevel = 1,
  sortOrder = 'az',
} = {}) {
  const isPlana = layoutMode === 'plana';
  if (isPlana) {
    return { mode: 'plana', produtos: produtos || [] };
  }

  const tree = buildTree(produtos || []);
  const expanded = buildExpandedForLevel(tree, treeLevel);
  const rows = mergeAdjacentDuplicateGroupHeaders(
    flattenTree(tree, expanded, '', 0, sortOrder),
  );
  return { mode: 'tree', rows };
}
