/** Ordem alfabética consistente (pivot) em árvores hierárquicas. */
export function compareTreeLabels(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR', { sensitivity: 'base' });
}

/** Entradas de um mapa de nós (exclui órfãos na raiz), A–Z por chave/label. */
export function sortedTreeChildEntries(nodeMap) {
  if (!nodeMap || typeof nodeMap !== 'object') return [];
  return Object.entries(nodeMap)
    .filter(([k]) => k !== '_rootSkus' && k !== '_rootItems')
    .sort(([ka], [kb]) => compareTreeLabels(ka, kb));
}
