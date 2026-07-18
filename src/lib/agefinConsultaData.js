/**
 * Regras de leitura partilhadas com a página AGEFIN Consulta.
 * Fonte de verdade operacional: LancamentoFinanceiro (tag conta_pagar).
 */
import {
  lancamentoCancelado,
  lancamentoCompraMercadoriaPedidoPagamentoAVista,
  lancamentoEhContaPagar,
} from '@/lib/agefinConsultaFilters';

/** Mesmo critério da lista principal em AgefinConsulta.jsx */
export function lancamentoEntraNaPautaAgefin(lf) {
  if (!lf || lancamentoCancelado(lf)) return false;
  if (lancamentoCompraMercadoriaPedidoPagamentoAVista(lf)) return false;
  return (
    lancamentoEhContaPagar(lf) ||
    (lf?.tipo === 'Despesa' && lf?.referencia_tipo === 'EventosLogisticos')
  );
}

/** Planejamento financeiro: contas a pagar (sem fretes de itinerário). */
export function lancamentoEntraNoPlanejamento(lf) {
  if (!lf || lancamentoCancelado(lf)) return false;
  if (lancamentoCompraMercadoriaPedidoPagamentoAVista(lf)) return false;
  return lancamentoEhContaPagar(lf);
}

export function filtrarLancamentosPautaAgefin(lancamentos = []) {
  return (lancamentos || []).filter(lancamentoEntraNaPautaAgefin);
}

export function filtrarLancamentosPlanejamento(lancamentos = []) {
  return (lancamentos || []).filter(lancamentoEntraNoPlanejamento);
}
