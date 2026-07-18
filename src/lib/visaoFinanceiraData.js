import { filtrarLancamentosBudgetMes } from '@/lib/budgetCalculos';
import {
  listarModelos as listarModelosBudget,
  listarCompetencias as listarCompetenciasBudget,
  obterLucroBrutoCompetencia,
} from '@/lib/budgetService';
import { listarModelos as listarModelosFolha, listarCompetencias as listarCompetenciasFolha } from '@/lib/folhaPrevisaoService';
import {
  listarModelos as listarModelosAgefin,
} from '@/lib/agefinPrevisaoService';
import {
  lancamentoRecorrenteContaPagarParaListaBoleto,
  mesReferenciaLancamento,
} from '@/lib/agefinLancamentosRecorrencia';
import { listarLancamentosFinanceirosCache } from '@/lib/lancamentoFinanceiroCache';

/**
 * Carrega todos os dados da Visão Financeira com o mínimo de round-trips:
 * - 1× LancamentoFinanceiro (cache compartilhado)
 * - modelos/competências/lucro bruto em paralelo
 */
export async function carregarDadosVisaoFinanceira(competencia) {
  const prefix = String(competencia || '').slice(0, 7);

  const [
    modelosAgefin,
    modelosFolha,
    modelosBudget,
    competenciasFolha,
    competenciasBudget,
    lancamentosTodos,
    lucroBrutoMes,
  ] = await Promise.all([
    listarModelosAgefin(),
    listarModelosFolha(),
    listarModelosBudget(),
    listarCompetenciasFolha(competencia),
    listarCompetenciasBudget(competencia),
    listarLancamentosFinanceirosCache(),
    obterLucroBrutoCompetencia(competencia),
  ]);

  const lancamentosRecorrentesAgefin = (lancamentosTodos || []).filter(
    lancamentoRecorrenteContaPagarParaListaBoleto,
  );
  const lancamentosAgefin = lancamentosRecorrentesAgefin.filter(
    (lf) => mesReferenciaLancamento(lf) === competencia,
  );
  const lancamentosMes = filtrarLancamentosBudgetMes(lancamentosTodos, competencia);
  const lancamentosVencimento = (lancamentosTodos || []).filter(
    (lancamento) => String(lancamento?.data_vencimento || '').slice(0, 7) === prefix,
  );

  return {
    modelosAgefin,
    modelosFolha,
    modelosBudget,
    competenciasFolha,
    competenciasBudget,
    lancamentosAgefin,
    lancamentosMes,
    lancamentosVencimento,
    lancamentosRecorrentesAgefin,
    lucroBrutoMes,
  };
}
