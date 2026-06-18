import { toLocalDateKey } from '@/components/utils/dateUtils';
import { sortLancamentosPorDescricao } from '@/lib/financialUtils';
import {
  contaUsaRegraCaixaPDV,
  idsMovimentosComLancamentoFinanceiro,
  isMovimentoTransferenciaCaixaPDV,
  movimentoParticipaExtrato,
  projetarLinhaFluxoCaixa,
  totaisGrupoFluxoCaixa,
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
    categoria: mov.categoria || 'Transferência entre Contas',
    tipoExibicao: tipo === 'Despesa' ? 'Transferência' : undefined,
  };
}

function dataChaveMovimento(mov) {
  const data = mov.data_pagamento || mov.data_vencimento || mov.created_date;
  return data ? toLocalDateKey(data) : null;
}

/**
 * Grupos do Fluxo de Caixa: lista todos os lançamentos filtrados + movimentos PDV órfãos.
 * Totais do dia separam operacional vs transferência (recolhimento/fechamento).
 */
export function montarGruposFluxoCaixa({
  lancamentos = [],
  movimentos = [],
  todosLancamentos = [],
  contas = [],
  contasSel = [],
  contasById = {},
  formatGrupoLabel,
  hStr,
  oStr,
}) {
  const movimentosJaNoFinanceiro = idsMovimentosComLancamentoFinanceiro(todosLancamentos);
  const pdvIds = new Set(
    contas
      .filter(
        (c) => contaUsaRegraCaixaPDV(c) && (!contasSel.length || contasSel.includes(c.id)),
      )
      .map((c) => c.id),
  );

  const map = {};
  lancamentos.forEach((l) => {
    const dr = l.data_pagamento || l.data_vencimento;
    const k = dr ? toLocalDateKey(dr) : 'sem-data';
    (map[k] = map[k] || []).push(l);
  });

  movimentos.forEach((m) => {
    if (!pdvIds.has(m.conta_id)) return;
    if (movimentosJaNoFinanceiro.has(String(m.id))) return;
    if (m.tipo !== 'Reforço' && !isMovimentoTransferenciaCaixaPDV(m)) return;
    const k = m.created_date ? toLocalDateKey(m.created_date) : 'sem-data';
    (map[k] = map[k] || []).push({ ...m, origem: 'movimento' });
  });

  return Object.keys(map)
    .sort((a, b) => b.localeCompare(a))
    .map((dia) => {
      const brutos = map[dia];
      const itemsOrdenados = sortLancamentosPorDescricao(brutos);
      const items = itemsOrdenados.map((m) => {
        if (m.origem === 'movimento') {
          return projetarLinhaFluxoCaixa(normalizarMovimentoCaixaParaLinha(m));
        }
        return projetarLinhaFluxoCaixa(m);
      });
      const totaisGrupo = totaisGrupoFluxoCaixa(itemsOrdenados, contasById);
      const label = dia === 'sem-data' ? 'Sem data' : formatGrupoLabel(dia, hStr, oStr);

      return {
        k: dia,
        label,
        items,
        totais: {
          r: totaisGrupo.r,
          d: totaisGrupo.d,
          liquido: totaisGrupo.liquido,
        },
      };
    });
}

/**
 * Grupos por dia alinhados ao extrato (Caixa PDV: só dinheiro físico na gaveta).
 * Usado no extrato da conta — não no Fluxo de Caixa geral.
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
      const contasById = { [conta.id]: conta };
      const items = sortLancamentosPorDescricao(brutos).map((m) => {
        const linha = m.origem === 'movimento' ? normalizarMovimentoCaixaParaLinha(m) : m;
        return projetarLinhaFluxoCaixa(linha);
      });
      const totaisGrupo = totaisGrupoFluxoCaixa(brutos, contasById);
      const label =
        dia === 'sem-data' ? 'Sem data' : formatGrupoLabel(dia, hStr, oStr);

      return {
        k: dia,
        label,
        items,
        totais: {
          r: totaisGrupo.r,
          d: totaisGrupo.d,
          liquido: totaisGrupo.liquido,
        },
      };
    });
}
