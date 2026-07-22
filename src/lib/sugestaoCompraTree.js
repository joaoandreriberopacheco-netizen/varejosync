import { collectSkus } from '@/components/produtos/treegrid/useTreeGrid';
import { grupoCompraHierarquiaKey } from '@/lib/calcularSugestaoCompraHierarquia';
import { resolveProdutoAbcdClasse } from '@/lib/catalogAbcdEnrichment';

/** Produtos únicos das linhas de sugestão (para montar a árvore). */
export function extractProdutosFromSugestaoLinhas(linhas = []) {
  const byId = new Map();
  for (const linha of linhas || []) {
    for (const sku of linha?.skus || []) {
      if (sku?.id != null && !byId.has(sku.id)) byId.set(sku.id, sku);
    }
  }
  return [...byId.values()];
}

export function buildSugestaoCompraLinhaLookup(linhas = []) {
  const bySkuId = new Map();
  const byGrupoKey = new Map();

  for (const linha of linhas || []) {
    if (linha.tipo === 'grupo') {
      const key = String(linha.id || '').replace(/^grupo:/, '');
      if (key) byGrupoKey.set(key, linha);
      for (const sku of linha.skus || []) {
        bySkuId.set(sku.id, { linha, isGrupoMember: true });
      }
    } else if (linha?.produto?.id != null) {
      bySkuId.set(linha.produto.id, { linha, isGrupoMember: false });
    }
  }

  return { bySkuId, byGrupoKey };
}

export function resolveSugestaoLinhaForTreeRow(row, lookup, { agruparHierarquia = true } = {}) {
  if (!row || !lookup) return null;
  if (row.isCategoryBand) return null;

  if (row.type === 'sku') {
    const entry = lookup.bySkuId.get(row.produto?.id);
    if (!entry) return null;
    if (entry.isGrupoMember && agruparHierarquia) return null;
    return entry.linha;
  }

  if (row.type !== 'group' || !row.node) return null;

  const skus = collectSkus(row.node);
  if (skus.length === 1) {
    const entry = lookup.bySkuId.get(skus[0].id);
    if (!entry || (entry.isGrupoMember && agruparHierarquia)) return null;
    return entry.linha;
  }

  const key = grupoCompraHierarquiaKey(skus[0]);
  if (key && lookup.byGrupoKey.has(key)) {
    return lookup.byGrupoKey.get(key);
  }

  return null;
}

export function countDescendantSugestaoLinhas(row, lookup, { agruparHierarquia = true } = {}) {
  if (!row?.node || !lookup) return 0;
  const skus = collectSkus(row.node);
  const seen = new Set();
  let count = 0;

  for (const sku of skus) {
    const entry = lookup.bySkuId.get(sku.id);
    if (!entry || seen.has(entry.linha.id)) continue;
    if (entry.isGrupoMember && agruparHierarquia) {
      const key = grupoCompraHierarquiaKey(sku);
      const grupo = key ? lookup.byGrupoKey.get(key) : null;
      if (grupo && !seen.has(grupo.id)) {
        seen.add(grupo.id);
        count += 1;
      }
      continue;
    }
    seen.add(entry.linha.id);
    count += 1;
  }

  return count;
}

export function getLinhaAbcdLetter(linha) {
  const sku = linha?.produto || linha?.skus?.[0];
  return resolveProdutoAbcdClasse(sku) || '';
}
