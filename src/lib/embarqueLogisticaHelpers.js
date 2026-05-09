import { rebuildEmbarqueItensMirror } from '@/lib/embarqueItemContract';

/**
 * Percentuais de despacho/conclusão a partir dos embarques reais (entidade Embarque),
 * alinhado à lógica de `integrarPedidosEmbarques` mas sem depender do snapshot no PedidoCompra.
 */
export function calcularPercentuaisLogistica(pedido, embarques = []) {
  const totalPedido = (pedido?.itens || []).reduce(
    (acc, item) => acc + (Number(item.quantidade_base ?? item.quantidade) || 0),
    0
  );
  if (!totalPedido) {
    return { despachado: 0, concluido: 0, pendente: 100 };
  }

  const linhas = (embarques || []).filter((emb) => emb?.tipo !== 'Necessidade');
  const porProdutoEmb = {};
  const porProdutoRec = {};

  linhas.forEach((emb) => {
    const arr =
      Array.isArray(emb.itens_embarcados) && emb.itens_embarcados.length > 0
        ? emb.itens_embarcados
        : Array.isArray(emb.itens)
          ? emb.itens
          : [];
    arr.forEach((item) => {
      const pid = item.produto_id;
      if (!pid) return;
      porProdutoEmb[pid] = (porProdutoEmb[pid] || 0) + (Number(item.quantidade_embarcada) || 0);
      porProdutoRec[pid] = (porProdutoRec[pid] || 0) + (Number(item.quantidade_recebida) || 0);
    });
  });

  let totalDespachado = 0;
  let totalConcluido = 0;
  (pedido?.itens || []).forEach((item) => {
    const pedida = Number(item.quantidade_base ?? item.quantidade) || 0;
    const emb = porProdutoEmb[item.produto_id] || 0;
    const rec = porProdutoRec[item.produto_id] || 0;
    totalDespachado += Math.min(pedida, emb);
    totalConcluido += Math.min(pedida, rec);
  });

  const pd = Number(((totalDespachado / totalPedido) * 100).toFixed(2));
  const pc = Number(((totalConcluido / totalPedido) * 100).toFixed(2));
  const pp = Number(Math.max(0, 100 - pd).toFixed(2));

  return { despachado: pd, concluido: pc, pendente: pp };
}

export function derivarStatusEmbarqueAgregado(pctDespachado) {
  if (pctDespachado >= 100) return 'Total';
  if (pctDespachado > 0) return 'Parcial';
  return 'Nenhum';
}

/**
 * Preenche `itens` / `itens_embarcados` no espelho legado quando só existem linhas em EmbarqueItem.
 */
export async function hydrateEmbarquesLinhasDesdeCanonical(base44, pedidoCompraId, embarques) {
  if (!base44 || !pedidoCompraId || !Array.isArray(embarques)) return embarques;

  const precisa = embarques.some((emb) => {
    const it = emb.itens_embarcados?.length ? emb.itens_embarcados : emb.itens;
    return !Array.isArray(it) || it.length === 0;
  });
  if (!precisa) return embarques;

  let canonical = [];
  try {
    canonical = await base44.entities.EmbarqueItem.filter({ pedido_compra_id: pedidoCompraId }, 'ordem', 500);
  } catch (e) {
    console.warn('[hydrateEmbarquesLinhasDesdeCanonical] EmbarqueItem.filter:', e?.message || e);
    return embarques;
  }

  const byEmb = {};
  (canonical || []).forEach((row) => {
    const eid = row.embarque_id;
    if (!eid) return;
    if (!byEmb[eid]) byEmb[eid] = [];
    byEmb[eid].push(row);
  });

  return embarques.map((emb) => {
    const rows = byEmb[emb.id];
    if (!rows?.length) return emb;
    const hasMirror =
      (Array.isArray(emb.itens) && emb.itens.length > 0) ||
      (Array.isArray(emb.itens_embarcados) && emb.itens_embarcados.length > 0);
    if (hasMirror) return emb;
    const mirror = rebuildEmbarqueItensMirror(rows);
    return {
      ...emb,
      itens: mirror,
      itens_embarcados: mirror,
    };
  });
}
