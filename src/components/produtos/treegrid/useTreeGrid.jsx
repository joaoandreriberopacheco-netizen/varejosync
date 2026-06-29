import { useMemo } from 'react';
import { buildCategoryTree, buildTree } from './catalogTreeCore';

export * from './catalogTreeCore';

/** Assinatura estável: evita rebuild da árvore quando o pai recria o array sem mudar catálogo. */
function catalogTreeSignature(produtos) {
  if (!produtos?.length) return '';
  return produtos
    .map((p) =>
      [
        p?.id,
        (p?.campo_hierarquico_1 || '').trim(),
        (p?.campo_hierarquico_2 || '').trim(),
        (p?.campo_hierarquico_3 || '').trim(),
        (p?.campo_hierarquico_4 || '').trim(),
        p?.estoque_atual ?? '',
        p?.preco_custo_calculado ?? '',
        p?.preco_venda_padrao ?? '',
        p?.ativo ? 1 : 0,
        p?.abcd ?? '',
        p?.iep_score ?? '',
        p?.iep_score_nivel_1 ?? '',
        p?.iep_score_nivel_2 ?? '',
      ].join('|')
    )
    .sort()
    .join('\n');
}

function categoryTreeSignature(produtos) {
  if (!produtos?.length) return '';
  return produtos
    .map((p) =>
      [
        p?.id,
        (p?.categoria_nome || '').trim(),
        (p?.campo_hierarquico_1 || '').trim(),
        (p?.campo_hierarquico_2 || '').trim(),
        (p?.campo_hierarquico_3 || '').trim(),
        (p?.campo_hierarquico_4 || '').trim(),
        p?.estoque_atual ?? '',
        p?.preco_custo_calculado ?? '',
        p?.preco_venda_padrao ?? '',
        p?.ativo ? 1 : 0,
      ].join('|')
    )
    .sort()
    .join('\n');
}

export function useTreeGrid(produtos) {
  const sig = useMemo(() => catalogTreeSignature(produtos), [produtos]);
  return useMemo(() => buildTree(produtos), [sig, produtos]);
}

export function useCatalogTreeGrid(produtos, { groupByCategory = false } = {}) {
  const sig = useMemo(
    () => (groupByCategory ? categoryTreeSignature(produtos) : catalogTreeSignature(produtos)),
    [produtos, groupByCategory]
  );
  return useMemo(
    () => (groupByCategory ? buildCategoryTree(produtos) : buildTree(produtos)),
    [sig, produtos, groupByCategory]
  );
}
