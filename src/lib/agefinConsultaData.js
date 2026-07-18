/**
 * Regras de leitura partilhadas com a página AGEFIN Consulta.
 * Fonte de verdade operacional: LancamentoFinanceiro (tag conta_pagar).
 */
import {
  lancamentoCancelado,
  lancamentoCompraMercadoriaPedidoPagamentoAVista,
  lancamentoEhCmv,
  lancamentoEhCompraMercadoriaPedido,
  lancamentoEhContaPagar,
  lancamentoEhFreteItinerario,
} from '@/lib/agefinConsultaFilters';
import {
  lancamentoRecorrenteContaPagarParaListaBoleto,
  mesReferenciaLancamento,
} from '@/lib/agefinLancamentosRecorrencia';

/** Mesmo critério da lista principal em AgefinConsulta.jsx */
export function lancamentoEntraNaPautaAgefin(lf) {
  if (!lf || lancamentoCancelado(lf)) return false;
  if (lancamentoCompraMercadoriaPedidoPagamentoAVista(lf)) return false;
  return (
    lancamentoEhContaPagar(lf) ||
    (lf?.tipo === 'Despesa' && lf?.referencia_tipo === 'EventosLogisticos')
  );
}

/**
 * Conta a pagar no planejamento — sem fretes, CMV nem compras de mercadoria.
 * (A AGEFIN Consulta mostra fretes na pauta; o planejamento não.)
 */
export function lancamentoEntraNoPlanejamento(lf) {
  if (!lf || lancamentoCancelado(lf)) return false;
  if (lancamentoCompraMercadoriaPedidoPagamentoAVista(lf)) return false;
  if (lancamentoEhFreteItinerario(lf)) return false;
  if (lancamentoEhCmv(lf)) return false;
  if (lancamentoEhCompraMercadoriaPedido(lf)) return false;
  return lancamentoEhContaPagar(lf);
}

/**
 * Cadastro de contas fixas: recorrentes explícitas ou mesmo grupo em 2+ meses.
 * Exclui fretes avulsos e lançamentos únicos com tag conta_pagar.
 */
export function grupoLancamentosPareceContaFixa(rows = []) {
  if (!rows.length) return false;
  if (rows.some(lancamentoEhFreteItinerario)) return false;
  if (rows.some(lancamentoRecorrenteContaPagarParaListaBoleto)) return true;
  const meses = new Set(rows.map((l) => mesReferenciaLancamento(l)).filter(Boolean));
  return meses.size >= 2;
}

export function lancamentoEntraEmContasFixas(lf) {
  return lancamentoEntraNoPlanejamento(lf) && lancamentoRecorrenteContaPagarParaListaBoleto(lf);
}

export function filtrarLancamentosPautaAgefin(lancamentos = []) {
  return (lancamentos || []).filter(lancamentoEntraNaPautaAgefin);
}

export function filtrarLancamentosPlanejamento(lancamentos = []) {
  return (lancamentos || []).filter(lancamentoEntraNoPlanejamento);
}

export function filtrarLancamentosContasFixas(lancamentos = []) {
  return (lancamentos || []).filter(lancamentoEntraEmContasFixas);
}
