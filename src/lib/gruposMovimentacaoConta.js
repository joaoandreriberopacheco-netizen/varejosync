import { toLocalDateKey } from '@/components/utils/dateUtils';
import { roundToTwoDecimals, sortLancamentosPorCodigo } from '@/lib/financialUtils';
import {
  contaUsaRegraCaixaPDV,
  idsMovimentosComLancamentoFinanceiro,
  isMovimentoTransferenciaCaixaPDV,
  isTransferenciaEntreContas,
  movimentoParticipaExtrato,
  projetarLinhaFluxoCaixa,
  totaisGrupoFluxoCaixa,
} from '@/lib/saldoContaFinanceira';

function totaisDiaFromGrupo(totaisGrupo) {
  return {
    r: totaisGrupo.r,
    d: totaisGrupo.d,
    entrou: roundToTwoDecimals(totaisGrupo.r + totaisGrupo.transfIn),
    saiu: roundToTwoDecimals(totaisGrupo.d + totaisGrupo.transfOut),
    liquido: totaisGrupo.liquido,
  };
}

function chaveParTransferenciaLancamento(l) {
  if (!isTransferenciaEntreContas(l) || l.origem === 'movimento') return null;
  if (l.referencia_tipo === 'MovimentosCaixa' && l.referencia_id != null) {
    return `mc:${l.referencia_id}`;
  }
  const data = l.data_pagamento || l.data_vencimento || '';
  const valor = Number(l.valor || 0).toFixed(2);
  if (l.categoria === 'Transferência entre Contas' || l.referencia_tipo === 'Manual') {
    return `tr:${data}:${valor}`;
  }
  return null;
}

function extrairNotaTransferencia(despesa, receita) {
  const origem = despesa?.conta_financeira_nome || '';
  const destino = receita?.conta_financeira_nome || '';

  const limpar = (text) => {
    if (!text) return '';
    let s = String(text).trim();
    if (origem) {
      s = s.replace(new RegExp(`^entrada de\\s+${origem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*`, 'i'), '');
      s = s.replace(new RegExp(`^transferência de\\s+${origem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\.?\\s*`, 'i'), '');
    }
    if (destino) {
      s = s.replace(new RegExp(`^transferência para\\s+${destino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\.?\\s*`, 'i'), '');
    }
    return s.trim();
  };

  for (const raw of [despesa?.observacoes, despesa?.descricao, receita?.observacoes, receita?.descricao]) {
    const note = limpar(raw);
    if (note.length > 2) return note;
  }
  return null;
}

/** Une par Despesa+Receita da mesma transferência numa linha só no Fluxo de Caixa. */
export function consolidarTransferenciasListaFluxo(items = []) {
  const grupos = new Map();
  items.forEach((item) => {
    const key = chaveParTransferenciaLancamento(item);
    if (!key) return;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(item);
  });

  const consolidados = new Map();
  const receitaOculta = new Set();

  grupos.forEach((grupo) => {
    const despesa = grupo.find((i) => i.tipo === 'Despesa');
    const receita = grupo.find((i) => i.tipo === 'Receita');
    if (!despesa || !receita) return;
    if (Math.abs(Number(despesa.valor || 0) - Number(receita.valor || 0)) > 0.009) return;

    consolidados.set(despesa.id, {
      id: `transfer-par-${despesa.id}-${receita.id}`,
      isTransferenciaConsolidada: true,
      tipoExibicao: 'Transferência',
      tipo: 'Transferência',
      valor: despesa.valor,
      data_pagamento: despesa.data_pagamento || receita.data_pagamento,
      data_vencimento: despesa.data_vencimento || receita.data_vencimento,
      contaOrigemNome: despesa.conta_financeira_nome || 'Origem',
      contaDestinoNome: receita.conta_financeira_nome || 'Destino',
      conta_origem_id: despesa.conta_financeira_id,
      conta_destino_id: receita.conta_financeira_id,
      notaTransferencia: extrairNotaTransferencia(despesa, receita),
      status: despesa.status || receita.status || 'Pago',
      status_conciliacao: despesa.status_conciliacao || receita.status_conciliacao,
      categoria: 'Transferência entre Contas',
      tags: despesa.tags || receita.tags,
      _lancamentoDespesa: despesa,
      _lancamentoReceita: receita,
    });
    receitaOculta.add(receita.id);
  });

  return items
    .filter((item) => !receitaOculta.has(item.id))
    .map((item) => consolidados.get(item.id) || item);
}

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
  ordemLancamentos = 'desc',
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
      const itemsOrdenados = sortLancamentosPorCodigo(brutos, ordemLancamentos);
      const itemsConsolidados = consolidarTransferenciasListaFluxo(itemsOrdenados);
      const items = itemsConsolidados.map((m) => {
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
        totais: totaisDiaFromGrupo(totaisGrupo),
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
      const items = sortLancamentosPorCodigo(brutos).map((m) => {
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
        totais: totaisDiaFromGrupo(totaisGrupo),
      };
    });
}
