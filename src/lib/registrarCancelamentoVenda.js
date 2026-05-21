/**
 * Cancelamento integrado: pedido + evento + rastro do turno + receitas financeiras.
 */

import {
  criarEventoCancelamento,
  prepararUpdateComEvento,
} from '@/lib/eventosVenda';
import { cancelarLancamentoFinanceiro } from '@/functions/cancelarLancamentoFinanceiro';
import { invalidateKpisVendasCache } from '@/hooks/useKPIsCache';

export async function registrarCancelamentoVenda(
  base44,
  { pedido, turno = null, motivo, operador_nome }
) {
  if (!pedido?.id) {
    return { ok: false, error: 'Pedido inválido' };
  }
  if ((pedido.status || '').toLowerCase() === 'cancelado') {
    return { ok: false, error: 'Esta venda já está cancelada' };
  }
  const motivoTxt = String(motivo || '').trim();
  if (!motivoTxt) {
    return { ok: false, error: 'Informe o motivo do cancelamento' };
  }

  const agora = new Date().toISOString();
  const evento = criarEventoCancelamento({
    motivo: motivoTxt,
    operador_nome: operador_nome || null,
    turno_id: turno?.id || pedido.turno_caixa_id || null,
  });
  const patchEvento = prepararUpdateComEvento(pedido, evento);

  await base44.entities.PedidoVenda.update(pedido.id, {
    status: 'Cancelado',
    ...patchEvento,
  });

  const turnoId = turno?.id || pedido.turno_caixa_id;
  if (turnoId) {
    let turnoAtual = turno;
    if (!turnoAtual?.id) {
      try {
        turnoAtual = await base44.entities.TurnoCaixa.get(turnoId);
      } catch {
        turnoAtual = null;
      }
    }
    if (turnoAtual) {
      const entrada = {
        pedido_id: pedido.id,
        pedido_numero: pedido.numero,
        cliente_nome: pedido.cliente_nome,
        valor_total: pedido.valor_total,
        motivo_cancelamento: motivoTxt,
        cancelado_por: operador_nome || null,
        data_cancelamento: agora,
      };
      const rastro = [...(turnoAtual.cancelamentos_rastro || []), entrada];
      await base44.entities.TurnoCaixa.update(turnoId, { cancelamentos_rastro: rastro });
    }
  }

  let lancamentosCancelados = 0;
  try {
    const todos = await base44.entities.LancamentoFinanceiro.filter({
      referencia_id: pedido.id,
      referencia_tipo: 'PedidoVenda',
    });
    const receitas = (todos || []).filter(
      (l) => l.tipo === 'Receita' && (l.status || '').toLowerCase() !== 'cancelado'
    );
    for (const l of receitas) {
      try {
        const res = await cancelarLancamentoFinanceiro({
          lancamentoId: l.id,
          motivo: `Cancelamento venda ${pedido.numero}: ${motivoTxt}`,
        });
        if (res?.data?.sucesso) lancamentosCancelados += res.data.cancelados || 1;
      } catch {
        /* continua nos demais lançamentos */
      }
    }
  } catch {
    /* financeiro opcional — pedido e turno já gravados */
  }

  invalidateKpisVendasCache();
  return { ok: true, lancamentosCancelados };
}
