/**
 * Consistência entre PedidoCompra e LancamentoFinanceiro na reabertura / reenvio ao financeiro.
 */

const isLancamentoPago = (l) =>
  l?.status === 'Pago' || Boolean(l?.data_pagamento);

const statusCancelavel = (l) =>
  l?.status === 'Em Aberto' || l?.status === 'Vencido';

export async function listarLancamentosPedidoCompra(base44, pedidoId) {
  if (!pedidoId) return [];
  const [porVinculo, porReferencia] = await Promise.all([
    base44.entities.LancamentoFinanceiro.filter({ pedido_compra_vinculado_id: pedidoId }),
    base44.entities.LancamentoFinanceiro.filter({
      referencia_id: pedidoId,
      referencia_tipo: 'PedidoCompra',
    }),
  ]);
  const merged = [...(porVinculo || []), ...(porReferencia || [])];
  return merged.filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);
}

export function temLancamentoPagoParaPedido(lancamentos) {
  return (lancamentos || []).some(isLancamentoPago);
}

/**
 * Cancela parcelas Em Aberto / Vencido vinculadas ao pedido (não pagas).
 * @returns {{ cancelados: number }}
 */
export async function cancelarLancamentosNaoPagosPedidoCompra(base44, pedidoId, notaObservacao) {
  const lancamentos = await listarLancamentosPedidoCompra(base44, pedidoId);
  const alvos = lancamentos.filter((l) => statusCancelavel(l) && !isLancamentoPago(l));
  const sufixo = notaObservacao ? ` ${notaObservacao}` : '';

  await Promise.all(
    alvos.map((l) =>
      base44.entities.LancamentoFinanceiro.update(l.id, {
        status: 'Cancelado',
        observacoes: `${l.observacoes || ''}\n[Cancelado: reabertura/correção do pedido]${sufixo}`.trim(),
      })
    )
  );

  return { cancelados: alvos.length };
}
