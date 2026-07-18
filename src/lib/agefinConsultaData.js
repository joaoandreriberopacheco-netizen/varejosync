/**
 * Regras de leitura partilhadas entre AGEFIN Consulta e Planejamento financeiro.
 * Fonte operacional: LancamentoFinanceiro (tag conta_pagar).
 *
 * Modelo de negócio:
 * - AGEFIN Consulta: todas as contas a pagar por vencimento (inclui fretes).
 * - Aba Contas fixas: cadastro de templates que renovam (mensal, bimestral, anual…).
 * - Previsão do mês: pauta do mês a partir dos templates + lançamentos gerados (sem fretes).
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
 * Template de conta fixa: só séries com recorrência explícita no financeiro.
 * Não infere recorrência por “apareceu em 2 meses” — isso misturava fretes/avulsos.
 */
export function grupoLancamentosPareceContaFixa(rows = []) {
  if (!rows.length) return false;
  if (rows.some(lancamentoEhFreteItinerario)) return false;
  return rows.some(lancamentoRecorrenteContaPagarParaListaBoleto);
}

/** Pelo menos um lançamento do grupo tem frequência ≠ Único (template renovável). */
export function grupoLancamentosTemFrequenciaRenovavel(rows = []) {
  if (!grupoLancamentosPareceContaFixa(rows)) return false;
  return rows.some((lf) => {
    const f = lf?.frequencia_recorrencia;
    return f && f !== 'Único';
  });
}

/** Lançamento que pode alimentar importação de template na aba Contas fixas. */
export function lancamentoEntraEmContasFixas(lf) {
  if (!lancamentoEntraNoPlanejamento(lf)) return false;
  if (!lancamentoRecorrenteContaPagarParaListaBoleto(lf)) return false;
  const f = lf?.frequencia_recorrencia;
  return Boolean(f && f !== 'Único');
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
