/**
 * Consolidação analítica do plano financeiro — contas fixas, folha (com provisões) e budgets.
 * Usado na visão ampla (Configurações → Financeiro).
 */

import {
  FREQUENCIA_SERIE,
  normalizarFrequenciaSerie,
  serieDeveAparecerNaCompetencia,
  valorEfetivoCompetencia,
  mapaModelosPorId,
  montarCompetenciasVisao as montarCompetenciasAgefin,
} from '@/lib/agefinPrevisaoCalculos';
import {
  calcularTotaisCompetencia,
  calcularProvisoesEventos,
  extrairSalarioBase,
  mapaModelosPorColaborador,
  montarCompetenciasVisao as montarCompetenciasFolha,
  TIPO_VINCULO,
  isSocio,
} from '@/lib/folhaPrevisaoCalculos';
import {
  calcularRealizadoPorTag,
  montarVisoesBudgets,
  calcularTotaisBudgets,
} from '@/lib/budgetCalculos';

const GRUPO = {
  FIXAS_RECORRENTES: 'fixas_recorrentes',
  FIXAS_ANUAIS: 'fixas_anuais',
  FOLHA: 'folha',
  FOLHA_PROVISOES: 'folha_provisoes',
  BUDGETS: 'budgets',
};

function linhaItem({
  id,
  grupo,
  nome,
  detalhe = '',
  valor,
  valorSecundario = null,
  valorSecundarioLabel = '',
  link = null,
  destaque = false,
}) {
  return {
    id,
    grupo,
    nome,
    detalhe,
    valor: Number(valor) || 0,
    valorSecundario: valorSecundario != null ? Number(valorSecundario) || 0 : null,
    valorSecundarioLabel,
    link,
    destaque,
  };
}

function ehContaAnual(modelo) {
  return normalizarFrequenciaSerie(modelo?.frequencia) === FREQUENCIA_SERIE.ANUAL;
}

function provisaoMensalAnual(valorAnual) {
  return (Number(valorAnual) || 0) / 12;
}

function provisaoMensal13(salarioBase) {
  return (Number(salarioBase) || 0) / 12;
}

function provisaoMensalTercoFerias(salarioBase) {
  return (Number(salarioBase) || 0) / 36;
}

function montarLinhasFixas(competencia, modelosAgefin, lancamentosAgefin) {
  const modelosMap = mapaModelosPorId(modelosAgefin);
  const competencias = montarCompetenciasAgefin(competencia, modelosAgefin, lancamentosAgefin);

  const recorrentes = [];
  const anuais = [];

  for (const comp of competencias) {
    const modelo = modelosMap[comp.serie_id];
    if (!modelo) continue;
    const valor = valorEfetivoCompetencia(comp, modelo);
    const detalhe = [
      comp.terceiro_nome,
      comp.categoria_nome,
      comp.centro_custo,
      normalizarFrequenciaSerie(modelo.frequencia),
    ]
      .filter(Boolean)
      .join(' · ');

    if (ehContaAnual(modelo)) {
      const venceNesteMes = serieDeveAparecerNaCompetencia(modelo, competencia);
      anuais.push(
        linhaItem({
          id: `anual-${comp.serie_id}`,
          grupo: GRUPO.FIXAS_ANUAIS,
          nome: comp.serie_nome || modelo.nome,
          detalhe,
          valor: provisaoMensalAnual(valor),
          valorSecundario: venceNesteMes ? valor : null,
          valorSecundarioLabel: venceNesteMes ? 'Vence neste mês' : 'Valor anual',
          link: `/PlanejamentoFinanceiro?competencia=${competencia}`,
          destaque: venceNesteMes,
        }),
      );
    } else {
      recorrentes.push(
        linhaItem({
          id: `fixa-${comp.serie_id}`,
          grupo: GRUPO.FIXAS_RECORRENTES,
          nome: comp.serie_nome || modelo.nome,
          detalhe,
          valor,
          link: `/PlanejamentoFinanceiro?competencia=${competencia}`,
        }),
      );
    }
  }

  return { recorrentes, anuais };
}

function montarLinhasFolha(competencia, modelosFolha, competenciasFolha) {
  const modelosMap = mapaModelosPorColaborador(modelosFolha);
  const competencias = montarCompetenciasFolha(competencia, modelosFolha, competenciasFolha);

  const folha = [];
  const provisoes = [];

  for (const comp of competencias) {
    const modelo = modelosMap[comp.colaborador_id];
    if (!modelo) continue;

    const totais = calcularTotaisCompetencia(comp, modelo);
    const socio = isSocio(modelo);
    const salarioBase = extrairSalarioBase(modelo);

    folha.push(
      linhaItem({
        id: `folha-${comp.colaborador_id}`,
        grupo: GRUPO.FOLHA,
        nome: comp.colaborador_nome || modelo.colaborador_nome || modelo.nome,
        detalhe: socio ? 'Sócio' : 'Funcionário',
        valor: totais.custoTotalEmpresa,
        link: `/FolhaPrevisao?competencia=${competencia}`,
      }),
    );

    if (!socio && modelo.decimo_terceiro_ativo !== false && salarioBase > 0) {
      provisoes.push(
        linhaItem({
          id: `prov-13-accrual-${comp.colaborador_id}`,
          grupo: GRUPO.FOLHA_PROVISOES,
          nome: `${comp.colaborador_nome || modelo.nome} — provisão 13º`,
          detalhe: 'Acumulação mensal (salário ÷ 12)',
          valor: provisaoMensal13(salarioBase),
          link: `/FolhaPrevisao?competencia=${competencia}`,
        }),
      );
    }

    if (!socio && salarioBase > 0) {
      provisoes.push(
        linhaItem({
          id: `prov-ferias-terco-${comp.colaborador_id}`,
          grupo: GRUPO.FOLHA_PROVISOES,
          nome: `${comp.colaborador_nome || modelo.nome} — provisão 1/3 férias`,
          detalhe: 'Estimativa mensal (salário ÷ 36)',
          valor: provisaoMensalTercoFerias(salarioBase),
          link: `/FolhaPrevisao?competencia=${competencia}`,
        }),
      );
    }

    const eventos = calcularProvisoesEventos(comp, modelo);
    for (const ev of eventos) {
      if (ev.categoria === 'decimo_terceiro' || ev.categoria === 'ferias' || ev.categoria === 'rescisao') {
        provisoes.push(
          linhaItem({
            id: ev.id || `prov-evento-${comp.colaborador_id}-${ev.nome}`,
            grupo: GRUPO.FOLHA_PROVISOES,
            nome: `${comp.colaborador_nome || modelo.nome} — ${ev.nome}`,
            detalhe: 'Evento previsto neste mês',
            valor: ev.valor,
            destaque: true,
            link: `/FolhaPrevisao?competencia=${competencia}`,
          }),
        );
      }
    }
  }

  return { folha, provisoes };
}

function montarLinhasBudgets(competencia, modelos, competencias, lancamentos) {
  const visoes = montarVisoesBudgets(modelos, competencia, competencias, lancamentos);
  return visoes.map((v) =>
    linhaItem({
      id: `budget-${v.modelo?.id}`,
      grupo: GRUPO.BUDGETS,
      nome: v.modelo?.nome || 'Budget',
      detalhe: [v.modelo?.categoria_nome, v.modelo?.centro_custo].filter(Boolean).join(' · '),
      valor: v.orcado || 0,
      valorSecundario: v.realizado || 0,
      valorSecundarioLabel: 'Realizado',
      link: `/Budgets?aba=acompanhamento&competencia=${competencia}`,
    }),
  );
}

function somaLinhas(linhas) {
  return (linhas || []).reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
}

function somaVencimentoAnual(linhas) {
  return (linhas || []).reduce(
    (acc, l) => acc + (l.valorSecundario != null && l.destaque ? Number(l.valorSecundario) || 0 : 0),
    0,
  );
}

const GRUPO_LABELS = {
  [GRUPO.FIXAS_RECORRENTES]: 'Contas fixas (recorrentes)',
  [GRUPO.FIXAS_ANUAIS]: 'Contas anuais (provisão mensal)',
  [GRUPO.FOLHA]: 'Folha de pagamento',
  [GRUPO.FOLHA_PROVISOES]: 'Provisões de folha',
  [GRUPO.BUDGETS]: 'Budgets',
};

const GRUPO_ORDEM = [
  GRUPO.FIXAS_RECORRENTES,
  GRUPO.FIXAS_ANUAIS,
  GRUPO.FOLHA,
  GRUPO.FOLHA_PROVISOES,
  GRUPO.BUDGETS,
];

/**
 * Monta visão consolidada analítica para uma competência.
 */
export function montarPlanoFinanceiroConsolidado({
  competencia,
  modelosAgefin = [],
  lancamentosAgefin = [],
  modelosFolha = [],
  competenciasFolha = [],
  modelosBudget = [],
  competenciasBudget = [],
  lancamentosMes = [],
  lucroBruto = 0,
  margemDetalhe = null,
}) {
  const { recorrentes, anuais } = montarLinhasFixas(competencia, modelosAgefin, lancamentosAgefin);
  const { folha, provisoes } = montarLinhasFolha(competencia, modelosFolha, competenciasFolha);
  const budgets = montarLinhasBudgets(competencia, modelosBudget, competenciasBudget, lancamentosMes);

  const subtotalFixasRecorrentes = somaLinhas(recorrentes);
  const subtotalAnuaisDiluido = somaLinhas(anuais);
  const subtotalAnuaisVencimento = somaVencimentoAnual(anuais);
  const subtotalFolha = somaLinhas(folha);
  const subtotalProvisoes = somaLinhas(provisoes);
  const subtotalBudgets = somaLinhas(budgets);

  const totalOperacional =
    subtotalFixasRecorrentes + subtotalFolha + subtotalBudgets;
  const totalProvisoesMensais = subtotalAnuaisDiluido + subtotalProvisoes;
  const totalComProvisoes = totalOperacional + totalProvisoesMensais;
  const totalDesembolsoMes = totalOperacional + subtotalAnuaisVencimento;

  const visoesBudget = montarVisoesBudgets(
    modelosBudget,
    competencia,
    competenciasBudget,
    lancamentosMes,
  );
  const totaisBudgets = calcularTotaisBudgets(visoesBudget);
  const realizadoFixas = calcularRealizadoPorTag(lancamentosMes, competencia, 'agefin_previsao');
  const realizadoFolha = calcularRealizadoPorTag(lancamentosMes, competencia, 'folha_previsao');
  const realizadoDespesas =
    realizadoFixas + realizadoFolha + (totaisBudgets.realizado || 0);

  const lucro = Number(lucroBruto) || 0;

  const mapaItens = {
    [GRUPO.FIXAS_RECORRENTES]: recorrentes,
    [GRUPO.FIXAS_ANUAIS]: anuais,
    [GRUPO.FOLHA]: folha,
    [GRUPO.FOLHA_PROVISOES]: provisoes,
    [GRUPO.BUDGETS]: budgets,
  };

  const grupos = GRUPO_ORDEM.filter((g) => (mapaItens[g] || []).length > 0).map((g) => ({
    id: g,
    label: GRUPO_LABELS[g],
    items: mapaItens[g],
    subtotal: somaLinhas(mapaItens[g]),
    separadoDoTotal: g === GRUPO.FIXAS_ANUAIS || g === GRUPO.FOLHA_PROVISOES,
  }));

  return {
    competencia,
    grupos,
    resumo: {
      fixasRecorrentes: subtotalFixasRecorrentes,
      anuaisDiluido: subtotalAnuaisDiluido,
      anuaisVencimentoMes: subtotalAnuaisVencimento,
      folha: subtotalFolha,
      provisoesFolha: subtotalProvisoes,
      budgets: subtotalBudgets,
      totalOperacional,
      totalProvisoesMensais,
      totalComProvisoes,
      totalDesembolsoMes,
      lucroBruto: lucro,
      resultadoOperacional: lucro - totalOperacional,
      resultadoComProvisoes: lucro - totalComProvisoes,
      resultadoDesembolso: lucro - totalDesembolsoMes,
      realizadoFixas,
      realizadoFolha,
      realizadoBudgets: totaisBudgets.realizado || 0,
      realizadoDespesas,
      resultadoRealizado: lucro - realizadoDespesas,
    },
    margemDetalhe,
  };
}
