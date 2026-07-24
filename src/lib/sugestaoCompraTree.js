import { collectSkus } from '@/components/produtos/treegrid/useTreeGrid';
import { grupoCompraHierarquiaKey } from '@/lib/calcularSugestaoCompraHierarquia';
import { aggregateSugestaoEstoqueVitrine, produtoSnapshotVitrineCompra } from '@/lib/sugestaoCompraVitrineDisplay';
import { resolveProdutoAbcdClasse } from '@/lib/catalogAbcdEnrichment';
import { enrichProdutosComIep } from '@/lib/calcularIepProdutos';
import { compareProdutosForCatalogSort } from '@/lib/catalogProdutoPerformance';
import {
  aggregateCatalogSalesVelocity,
  formatCatalogMedia30d,
} from '@/lib/catalogSalesVelocity';
import {
  buildProjecaoEstoque30d,
} from '@/lib/calcularSugestaoCompraVelocidade';

/** Ordena linhas de sugestão (representante = produto da linha). */
export function sortSugestaoCompraLinhas(linhas = [], sortOrder = 'abcd_desc') {
  return [...linhas].sort((a, b) =>
    compareProdutosForCatalogSort(a?.produto, b?.produto, sortOrder),
  );
}

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

/** Linhas de sugestão únicas abaixo de um nó de grupo (sem duplicar membros de família). */
export function collectDescendantSugestaoLinhas(row, lookup, { agruparHierarquia = true } = {}) {
  if (!row?.node || !lookup) return [];
  const skus = collectSkus(row.node);
  const seen = new Set();
  const linhas = [];

  for (const sku of skus) {
    const entry = lookup.bySkuId.get(sku.id);
    if (!entry || seen.has(entry.linha.id)) continue;
    if (entry.isGrupoMember && agruparHierarquia) {
      const key = grupoCompraHierarquiaKey(sku);
      const grupo = key ? lookup.byGrupoKey.get(key) : null;
      if (grupo && !seen.has(grupo.id)) {
        seen.add(grupo.id);
        linhas.push(grupo);
      }
      continue;
    }
    seen.add(entry.linha.id);
    linhas.push(entry.linha);
  }

  return linhas;
}

export function countDescendantSugestaoLinhas(row, lookup, options = {}) {
  return collectDescendantSugestaoLinhas(row, lookup, options).length;
}

function resolveEstoqueSkuParaAgregacao(sku = {}, linha = {}, incluirPedidosAprovados = false) {
  const pendenteSku = Number(sku?.estoque_pedidos_aprovados) || 0;
  const pendenteLinha =
    linha?.tipo === 'sku' ? Number(linha?.quantidade_pendente) || 0 : 0;
  const pedidos = pendenteSku > 0 ? pendenteSku : pendenteLinha;

  const fisicoRaw = sku?.estoque_fisico;
  const fisico = Number.isFinite(Number(fisicoRaw)) ? Number(fisicoRaw) : null;
  let estoque = Number(sku?.estoque_atual) || 0;

  if (incluirPedidosAprovados) {
    if (pedidos > 0) {
      const baseFisico = fisico != null ? fisico : Math.max(0, estoque - pedidos);
      return baseFisico + pedidos;
    }
    return estoque;
  }

  if (fisico != null) return fisico;
  if (pedidos > 0) return Math.max(0, estoque - pedidos);
  return estoque;
}

function skusComEstoqueSugestao(linhas = [], incluirPedidosAprovados = false) {
  const out = [];
  const seen = new Set();
  for (const linha of linhas) {
    for (const sku of linha?.skus || []) {
      if (!sku?.id || seen.has(sku.id)) continue;
      seen.add(sku.id);
      const estoque = resolveEstoqueSkuParaAgregacao(sku, linha, incluirPedidosAprovados);
      out.push({
        ...sku,
        estoque_atual: estoque,
      });
    }
  }
  return out;
}

/** Totais agregados para linhas de grupo da árvore (mesma ideia do catálogo). */
export function aggregateSugestaoTreeGroupMetrics(row, lookup, options = {}) {
  const linhas = collectDescendantSugestaoLinhas(row, lookup, options);
  if (!linhas.length) return null;

  const skusEstoque = skusComEstoqueSugestao(linhas, options.incluirPedidosAprovados === true);
  const estoqueDisp = aggregateSugestaoEstoqueVitrine(skusEstoque);
  const skus = skusEstoque;
  const velocityAgg = aggregateCatalogSalesVelocity(skus, options.salesVelocityMap || {});
  const media30dTexto = formatCatalogMedia30d(velocityAgg, { tilde: true });

  const estoqueTotal = skusEstoque.reduce(
    (sum, sku) => sum + (Number(sku?.estoque_atual) || 0),
    0,
  );
  const mediaDiaTotal = linhas.reduce(
    (sum, linha) => sum + (Number(linha?.sugestao?.media_dia) || 0),
    0,
  );
  const representativo = produtoSnapshotVitrineCompra(linhas[0]?.produto || skus[0]);
  const projecao = representativo
    ? buildProjecaoEstoque30d(representativo, estoqueTotal, mediaDiaTotal)
    : { projecao_estoque_30d_base: estoqueTotal - mediaDiaTotal * 30 };

  const qtdSugeridaBase = linhas.reduce(
    (sum, linha) => sum + (Number(linha?.sugestao?.quantidade_sugerida_base) || 0),
    0,
  );

  return {
    estoqueDisp,
    media30dTexto,
    projecao,
    qtdSugeridaBase,
    representativo: linhas[0]?.produto || skus[0],
  };
}

export function getLinhaAbcdLetter(linha, fallback = '') {
  const sku = linha?.produto || linha?.skus?.[0];
  return resolveProdutoAbcdClasse(sku) || fallback;
}

const ESTOQUE_OVERLAY_KEYS = ['estoque_atual', 'estoque_fisico', 'estoque_pedidos_aprovados'];

function mergeProdutoComOverlayEstoque(overlay, enriched) {
  if (!overlay) return enriched ?? null;
  if (!enriched) return overlay;
  const patch = {};
  for (const key of ESTOQUE_OVERLAY_KEYS) {
    if (overlay[key] != null) patch[key] = overlay[key];
  }
  return Object.keys(patch).length ? { ...enriched, ...patch } : enriched;
}

function applyAbcdMapToLinhas(linhas, enrichedMap) {
  if (!enrichedMap?.size) return linhas;
  return linhas.map((linha) => ({
    ...linha,
    produto: mergeProdutoComOverlayEstoque(
      linha.produto,
      enrichedMap.get(linha.produto?.id),
    ),
    skus: (linha.skus || []).map((s) =>
      mergeProdutoComOverlayEstoque(s, enrichedMap.get(s.id)),
    ),
  }));
}

/** ABCD/IEP ao vivo (mesma regra do catálogo) só nos SKUs das sugestões visíveis. */
export function enrichSugestaoLinhasComAbcd(linhas, prods, vendasDados) {
  if (!linhas?.length || !vendasDados?.pedidos90d?.length) return linhas;

  const ids = new Set();
  for (const linha of linhas) {
    for (const sku of linha?.skus || []) {
      if (sku?.id != null) ids.add(sku.id);
    }
  }
  if (!ids.size) return linhas;

  const subset = (prods || []).filter((p) => ids.has(p.id));
  const enriched = enrichProdutosComIep(subset, vendasDados);
  const map = new Map(enriched.map((p) => [p.id, p]));
  return applyAbcdMapToLinhas(linhas, map);
}
