/** Campos de performance (ABCD / IEP) — usados em relatórios e ordenação fora do catálogo. */

export const ABCD_RANK = { A: 4, B: 3, C: 2, D: 1 };

export const CATALOG_SORT_OPTIONS = [
  { id: 'az', label: 'Nome A → Z' },
  { id: 'za', label: 'Nome Z → A' },
  { id: 'abcd_desc', label: 'Classe ABCD (A primeiro)' },
  { id: 'abcd_asc', label: 'Classe ABCD (D primeiro)' },
];

export function getAbcdRank(letter) {
  return ABCD_RANK[String(letter || '').toUpperCase()] ?? 0;
}

export function getProdutoPerformanceValue(produto, fieldId) {
  if (!produto || !fieldId) return null;
  if (fieldId === 'abcd') return getAbcdRank(produto.abcd);
  const raw = produto[fieldId];
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

export function parseCatalogSortOrder(sortOrder) {
  if (!sortOrder || sortOrder === 'az' || sortOrder === 'za') {
    return { mode: 'name', direction: sortOrder === 'za' ? 'desc' : 'asc' };
  }
  const match = String(sortOrder).match(/^(.+)_(asc|desc)$/);
  if (!match) return { mode: 'name', direction: 'asc' };
  return { mode: match[1], direction: match[2] };
}

export function compareProdutosForCatalogSort(a, b, sortOrder) {
  const parsed = parseCatalogSortOrder(sortOrder);
  if (parsed.mode === 'name') {
    const cmp = (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR', { sensitivity: 'base' });
    return parsed.direction === 'desc' ? -cmp : cmp;
  }

  const aVal = getProdutoPerformanceValue(a, parsed.mode);
  const bVal = getProdutoPerformanceValue(b, parsed.mode);
  if (aVal !== bVal) {
    return parsed.direction === 'asc' ? aVal - bVal : bVal - aVal;
  }
  return (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR', { sensitivity: 'base' });
}

export function aggregatePerformanceFromSkus(skus) {
  if (!skus?.length) {
    return {
      abcdRankMedio: 0,
      abcdDominante: '',
      iepScoreMedio: 0,
      iepScoreNivel1Medio: 0,
      iepScoreNivel2Medio: 0,
      iepScoreNivel3Medio: 0,
      iepScoreNivel4Medio: 0,
      iepScoreNivel5Medio: 0,
    };
  }

  const ranks = skus.map((p) => getAbcdRank(p.abcd));
  const abcdRankMedio = ranks.reduce((s, v) => s + v, 0) / ranks.length;

  const freq = {};
  for (const p of skus) {
    const letter = String(p.abcd || '').toUpperCase();
    if (!letter) continue;
    freq[letter] = (freq[letter] || 0) + 1;
  }
  const abcdDominante = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  const avg = (field) => {
    const vals = skus.map((p) => Number(p[field]) || 0);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };

  return {
    abcdRankMedio,
    abcdDominante,
    iepScoreMedio: avg('iep_score'),
    iepScoreNivel1Medio: avg('iep_score_nivel_1'),
    iepScoreNivel2Medio: avg('iep_score_nivel_2'),
    iepScoreNivel3Medio: avg('iep_score_nivel_3'),
    iepScoreNivel4Medio: avg('iep_score_nivel_4'),
    iepScoreNivel5Medio: avg('iep_score_nivel_5'),
  };
}

export function getGroupPerformanceSortValue(agg, sortOrder) {
  const parsed = parseCatalogSortOrder(sortOrder);
  if (parsed.mode === 'name') return agg?.label || '';
  if (parsed.mode === 'abcd') return agg?.abcdRankMedio ?? 0;
  const map = {
    iep_score: 'iepScoreMedio',
    iep_score_nivel_1: 'iepScoreNivel1Medio',
    iep_score_nivel_2: 'iepScoreNivel2Medio',
    iep_score_nivel_3: 'iepScoreNivel3Medio',
    iep_score_nivel_4: 'iepScoreNivel4Medio',
    iep_score_nivel_5: 'iepScoreNivel5Medio',
  };
  return agg?.[map[parsed.mode]] ?? 0;
}

export function compareCatalogSortValues(aVal, bVal, sortOrder) {
  const parsed = parseCatalogSortOrder(sortOrder);
  if (parsed.mode === 'name') {
    const cmp = String(aVal).localeCompare(String(bVal), 'pt-BR', { sensitivity: 'base' });
    return parsed.direction === 'desc' ? -cmp : cmp;
  }
  const aNum = Number(aVal) || 0;
  const bNum = Number(bVal) || 0;
  if (aNum !== bNum) return parsed.direction === 'asc' ? aNum - bNum : bNum - aNum;
  return 0;
}
