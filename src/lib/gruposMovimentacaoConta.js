import { toLocalDateKey } from '@/components/utils/dateUtils';
import { sortLancamentosPorDescricao } from '@/lib/financialUtils';
import {
  idsMovimentosComLancamentoFinanceiro,
  movimentoParticipaExtrato,
  totaisEntradaSaidaMovimentos,
} from '@/lib/saldoContaFinanceira';

export function normalizarMovimentoCaixaParaLinha(mov) {
  const data = mov.data_pagamento || mov.data_vencimento || mov.created_date;
  let tipo = mov.tipo;
  if (tipo === 'Reforço') tipo = 'Receita';
  if (tipo === 'Sangria' || tipo === 'Recolhimento de Caixa') tipo = 'Despesa';

  return {
    ...mov,
    origem: 'movimento',
    tipo,
    descricao: mov.descricao || mov.observacao || mov.tipo,
    data_pagamento: data,
    data_vencimento: data,
    status: mov.status || 'Pago',
    categoria: mov.categoria || 'Caixa',
  };
}

function dataChaveMovimento(mov) {
  const data = mov.data_pagamento || mov.data_vencimento || mov.created_date;
  return data ? toLocalDateKey(data) : null;
}

/**
 * Grupos por dia alinhados ao extrato (Caixa PDV: só dinheiro físico + movimentos de caixa).
 */
export function montarGruposPorDiaConta({
  conta,
  lancamentos = [],
  movimentos = [],
  todosLancamentos = [],
  filtrarDataKey = null,
  filtrarBusca = null,
  formatGrupoLabel,
  hStr,
  oStr,
}) {
  if (!conta) return [];

  const movimentosJaNoFinanceiro = idsMovimentosComLancamentoFinanceiro(todosLancamentos);
  const participa = (mov) => movimentoParticipaExtrato(mov, conta);

  const todasMovimentacoes = [
    ...lancamentos.map((l) => ({ ...l, origem: 'lancamento' })),
    ...movimentos
      .filter((m) => !movimentosJaNoFinanceiro.has(String(m.id)))
      .map((m) => ({ ...m, origem: 'movimento' })),
  ].filter(participa);

  const noPeriodo = todasMovimentacoes.filter((mov) => {
    const dataKey = dataChaveMovimento(mov);
    if (filtrarDataKey && dataKey && !filtrarDataKey(dataKey)) return false;
    if (filtrarDataKey && !dataKey) return false;
    if (filtrarBusca && !filtrarBusca(mov)) return false;
    return true;
  });

  const porDia = {};
  noPeriodo.forEach((mov) => {
    const dia = dataChaveMovimento(mov) || 'sem-data';
    (porDia[dia] = porDia[dia] || []).push(mov);
  });

  return Object.keys(porDia)
    .sort((a, b) => b.localeCompare(a))
    .map((dia) => {
      const brutos = porDia[dia];
      const items = sortLancamentosPorDescricao(brutos).map((m) =>
        m.origem === 'movimento' ? normalizarMovimentoCaixaParaLinha(m) : m,
      );
      const { entradas: r, saidas: d } = totaisEntradaSaidaMovimentos(brutos, conta);
      const label =
        dia === 'sem-data' ? 'Sem data' : formatGrupoLabel(dia, hStr, oStr);

      return { k: dia, label, items, totais: { r, d } };
    });
}
