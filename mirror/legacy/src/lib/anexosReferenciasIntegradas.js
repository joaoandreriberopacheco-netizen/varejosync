/**
 * @param {{ referencia_tipo: string, referencia_id: string, label: string }[]} refs
 */
export function dedupeReferencias(refs) {
  const seen = new Set();
  return refs.filter((r) => {
    const k = `${r.referencia_tipo}:${r.referencia_id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Pedido de compra + lançamentos financeiros vinculados (aprovações, parcelas). */
export async function fetchReferenciasAnexosPedidoCompra(base44, pedidoId) {
  if (!pedidoId) return [];
  const refs = [
    {
      referencia_tipo: 'PedidoCompra',
      referencia_id: pedidoId,
      label: 'Pedido de compra',
    },
  ];
  try {
    const lfs = await base44.entities.LancamentoFinanceiro.filter({
      referencia_id: pedidoId,
      referencia_tipo: 'PedidoCompra',
    });
    (lfs || []).forEach((l) => {
      const d = String(l.descricao || '').trim();
      const short = d.length > 40 ? `${d.slice(0, 38)}…` : d || 'Lançamento';
      refs.push({
        referencia_tipo: 'LancamentoFinanceiro',
        referencia_id: l.id,
        label: `Lançamento (${short})`,
      });
    });
  } catch {
    /* ignore */
  }
  return dedupeReferencias(refs);
}

/**
 * Conta de frete + evento logístico + pedidos dos embarques vinculados à viagem.
 */
export function montarReferenciasFreteIntegradas({
  contaLancamento,
  eventoLogisticoId,
  pedidosCompraIds = [],
}) {
  const refs = [];
  if (contaLancamento?.id) {
    refs.push({
      referencia_tipo: 'LancamentoFinanceiro',
      referencia_id: contaLancamento.id,
      label: 'Conta a pagar (lançamento)',
    });
  }
  if (eventoLogisticoId) {
    refs.push({
      referencia_tipo: 'EventosLogisticos',
      referencia_id: eventoLogisticoId,
      label: 'Frete / viagem',
    });
  }
  (pedidosCompraIds || []).forEach((id) => {
    if (id) {
      refs.push({
        referencia_tipo: 'PedidoCompra',
        referencia_id: id,
        label: 'Pedido de compra (embarque)',
      });
    }
  });
  return dedupeReferencias(refs);
}

/**
 * Monta referências (tipo + id) para buscar anexos ligados ao mesmo contexto de negócio
 * que um LancamentoFinanceiro (pedido, conta prevista do importador, evento de frete).
 *
 * @param {Record<string, unknown>} l
 * @returns {{ referencia_tipo: string, referencia_id: string, label: string }[]}
 */
export function referenciasAnexosBaseParaLancamento(l) {
  if (!l?.id) return [];

  const refs = [];
  const push = (referencia_tipo, referencia_id, label) => {
    if (!referencia_tipo || !referencia_id) return;
    refs.push({ referencia_tipo, referencia_id, label });
  };

  push('LancamentoFinanceiro', l.id, 'Lançamento');

  const tags = Array.isArray(l.tags) ? l.tags : [];
  const temContaPagar = tags.includes('conta_pagar');

  if (l.referencia_tipo === 'PedidoCompra' && l.referencia_id) {
    push('PedidoCompra', l.referencia_id, 'Pedido de compra');
  } else if (l.pedido_compra_vinculado_id) {
    push('PedidoCompra', l.pedido_compra_vinculado_id, 'Pedido de compra');
  }

  if (l.referencia_tipo === 'EventosLogisticos' && l.referencia_id) {
    push('EventosLogisticos', l.referencia_id, 'Evento logístico (frete)');
  }

  if (l.referencia_tipo === 'Manual' && l.referencia_id && temContaPagar) {
    push('ContaPrevista', l.referencia_id, 'Conta prevista (importação)');
  }

  return dedupeReferencias(refs);
}
