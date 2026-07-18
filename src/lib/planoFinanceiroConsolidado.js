/**
 * Consolidação analítica do plano financeiro — contas fixas, folha, budgets
 * e compromissos pontuais do contas a pagar.
 * Usado na página Financeiro → Visão Financeira.
 */

import {
  FREQUENCIA_SERIE,
  normalizarFrequenciaSerie,
  serieDeveAparecerNaCompetencia,
  serieEstaAtivaNaCompetencia,
  valorEfetivoCompetencia,
  montarCompetenciasVisao as montarCompetenciasAgefin,
} from '@/lib/agefinPrevisaoCalculos';
import {
  calcularTotaisCompetencia,
  calcularProvisoesEventos,
  extrairSalarioBase,
  mapaModelosPorColaborador,
  montarCompetenciasVisao as montarCompetenciasFolha,
  isSocio,
} from '@/lib/folhaPrevisaoCalculos';
import {
  calcularRealizadoPorTag,
  lancamentoMatchCategoria,
  montarVisoesBudgets,
  calcularTotaisBudgets,
} from '@/lib/budgetCalculos';
import {
  lancamentoCancelado,
  lancamentoEhContaPagar,
  lancamentoEhCmv,
  lancamentoEhFreteItinerario,
  lancamentoPago,
} from '@/lib/agefinConsultaFilters';

const GRUPO = {
  FIXAS_RECORRENTES: 'fixas_recorrentes',
  FIXAS_ANUAIS: 'fixas_anuais',
  FOLHA: 'folha',
  FOLHA_PROVISOES: 'folha_provisoes',
  BUDGETS: 'budgets',
  PONTUAIS: 'pontuais',
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
  centroCusto = '',
  categoria = '',
  entraNoTotal = true,
  coberturaBudget = '',
  raw = null,
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
    centroCusto: String(centroCusto || '').trim(),
    categoria: String(categoria || '').trim(),
    entraNoTotal,
    coberturaBudget,
    raw,
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
  const competencias = montarCompetenciasAgefin(competencia, modelosAgefin, lancamentosAgefin);
  const competenciasMap = Object.fromEntries(
    competencias.map((comp) => [comp.serie_id, comp]),
  );

  const recorrentes = [];
  const anuais = [];

  for (const modelo of modelosAgefin || []) {
    if (!serieEstaAtivaNaCompetencia(modelo, competencia)) continue;
    const anual = ehContaAnual(modelo);
    if (!anual && !serieDeveAparecerNaCompetencia(modelo, competencia)) continue;

    const comp = competenciasMap[modelo.id];
    const valor = comp ? valorEfetivoCompetencia(comp, modelo) : Number(modelo.valor_previsto) || 0;
    const centroCusto = comp?.centro_custo || modelo.centro_custo || '';
    const categoria = comp?.categoria_nome || modelo.categoria_nome || '';
    const detalhe = [
      comp?.terceiro_nome || modelo.terceiro_nome,
      categoria,
      centroCusto,
      normalizarFrequenciaSerie(modelo.frequencia),
    ]
      .filter(Boolean)
      .join(' · ');

    if (anual) {
      const venceNesteMes = serieDeveAparecerNaCompetencia(modelo, competencia);
      anuais.push(
        linhaItem({
          id: `anual-${modelo.id}`,
          grupo: GRUPO.FIXAS_ANUAIS,
          nome: comp?.serie_nome || modelo.nome,
          detalhe,
          valor: provisaoMensalAnual(valor),
          valorSecundario: valor,
          valorSecundarioLabel: venceNesteMes ? 'Vence neste mês' : 'Valor anual',
          link: `/PlanejamentoFinanceiro?competencia=${competencia}`,
          destaque: venceNesteMes,
          centroCusto,
          categoria,
        }),
      );
    } else {
      recorrentes.push(
        linhaItem({
          id: `fixa-${modelo.id}`,
          grupo: GRUPO.FIXAS_RECORRENTES,
          nome: comp?.serie_nome || modelo.nome,
          detalhe,
          valor,
          link: `/PlanejamentoFinanceiro?competencia=${competencia}`,
          centroCusto,
          categoria,
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
    const centroCusto = modelo.centro_custo || comp.centro_custo || '';
    const categoriaFolha = socio ? 'Pró-labore / sócios' : 'Funcionários';

    folha.push(
      linhaItem({
        id: `folha-${comp.colaborador_id}`,
        grupo: GRUPO.FOLHA,
        nome: comp.colaborador_nome || modelo.colaborador_nome || modelo.nome,
        detalhe: socio ? 'Sócio' : 'Funcionário',
        valor: totais.custoTotalEmpresa,
        link: `/FolhaPrevisao?competencia=${competencia}`,
        centroCusto,
        categoria: categoriaFolha,
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
          centroCusto,
          categoria: '13º salário',
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
          centroCusto,
          categoria: 'Férias',
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
            centroCusto,
            categoria:
              ev.categoria === 'decimo_terceiro'
                ? '13º salário'
                : ev.categoria === 'ferias'
                  ? 'Férias'
                  : 'Rescisão',
            entraNoTotal: false,
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
      centroCusto: v.modelo?.centro_custo || '',
      categoria: v.modelo?.categoria_nome || '',
    }),
  );
}

function tagsLancamento(lancamento) {
  return (Array.isArray(lancamento?.tags) ? lancamento.tags : []).map((tag) =>
    String(tag).trim().toLocaleLowerCase('pt-BR'),
  );
}

function valorLancamento(lancamento) {
  return Math.abs(Number(lancamento?.valor_liquido ?? lancamento?.valor) || 0);
}

function encontrarBudgetCobertura(lancamento, modelosBudget) {
  return (modelosBudget || []).find(
    (modelo) => modelo?.ativo !== false && lancamentoMatchCategoria(lancamento, modelo),
  );
}

function montarLinhasPontuais({
  competencia,
  lancamentosVencimento,
  modelosAgefin,
  modelosFolha,
  competenciasFolha,
  modelosBudget,
}) {
  const gruposFixas = new Set(
    (modelosAgefin || []).map((modelo) => modelo?.grupo_lancamento_id).filter(Boolean),
  );
  const gruposFolha = new Set(
    [...(modelosFolha || []), ...(competenciasFolha || [])]
      .map((item) => item?.grupo_lancamento_id)
      .filter(Boolean),
  );

  return (lancamentosVencimento || [])
    .filter((lancamento) => {
      if (!lancamento || lancamento.tipo !== 'Despesa' || lancamentoCancelado(lancamento)) {
        return false;
      }
      if (!lancamentoEhContaPagar(lancamento) && !lancamentoEhFreteItinerario(lancamento)) {
        return false;
      }
      if (String(lancamento.data_vencimento || '').slice(0, 7) !== competencia) return false;

      const tags = tagsLancamento(lancamento);
      if (tags.includes('agefin_previsao') || tags.includes('folha_previsao')) return false;
      if (gruposFixas.has(lancamento.grupo_lancamento_id)) return false;
      if (gruposFolha.has(lancamento.grupo_lancamento_id)) return false;
      return true;
    })
    .map((lancamento) => {
      const frete = lancamentoEhFreteItinerario(lancamento);
      const cmv = lancamentoEhCmv(lancamento);
      const budgetCobertura = encontrarBudgetCobertura(lancamento, modelosBudget);
      const parcela =
        lancamento.numero_parcelas_total > 1
          ? `Parcela ${lancamento.parcela_atual || '?'} de ${lancamento.numero_parcelas_total}`
          : '';
      const status = lancamentoPago(lancamento) ? 'Pago' : 'Em aberto';
      const categoria =
        String(lancamento.categoria || '').trim() ||
        (frete ? 'Frete de mercadoria' : cmv ? 'Compra de mercadoria' : 'Sem categoria');
      const centroCusto = String(lancamento.centro_custo || '').trim();
      const coberturaBudget = budgetCobertura?.nome || '';
      const detalhe = [
        lancamento.terceiro_nome,
        parcela,
        status,
        frete ? 'Frete' : '',
        cmv ? 'CMV' : '',
        coberturaBudget ? `Coberto pelo budget ${coberturaBudget}` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      return linhaItem({
        id: `pontual-${lancamento.id}`,
        grupo: GRUPO.PONTUAIS,
        nome: lancamento.descricao || lancamento.terceiro_nome || 'Conta pontual',
        detalhe,
        valor: valorLancamento(lancamento),
        valorSecundario: null,
        link: `/AgefinConsulta?competencia=${competencia}`,
        destaque: frete,
        centroCusto,
        categoria,
        // Budgets já representam o limite planejado; CMV já está refletido no lucro bruto.
        entraNoTotal: !budgetCobertura && !cmv,
        coberturaBudget,
        raw: lancamento,
      });
    })
    .sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
    );
}

function nomeGrupo(valor, fallback) {
  return String(valor || '').trim() || fallback;
}

function compararNome(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base' });
}

/** Centro de custo → categoria → itens em ordem alfabética. */
export function agruparItensCentroCategoria(items = []) {
  const centros = new Map();

  for (const item of items) {
    const centro = nomeGrupo(item.centroCusto, 'Sem centro de custo');
    const categoria = nomeGrupo(item.categoria, 'Sem categoria');
    if (!centros.has(centro)) centros.set(centro, new Map());
    const categorias = centros.get(centro);
    if (!categorias.has(categoria)) categorias.set(categoria, []);
    categorias.get(categoria).push(item);
  }

  return [...centros.entries()]
    .sort(([a], [b]) => {
      if (a === 'Sem centro de custo') return 1;
      if (b === 'Sem centro de custo') return -1;
      return compararNome(a, b);
    })
    .map(([centro, categorias]) => ({
      id: centro,
      label: centro,
      subtotal: somaLinhas([...categorias.values()].flat()),
      categorias: [...categorias.entries()]
        .sort(([a], [b]) => {
          if (a === 'Sem categoria') return 1;
          if (b === 'Sem categoria') return -1;
          return compararNome(a, b);
        })
        .map(([categoria, linhas]) => ({
          id: `${centro}:${categoria}`,
          label: categoria,
          subtotal: somaLinhas(linhas),
          items: [...linhas].sort((a, b) => compararNome(a.nome, b.nome)),
        })),
    }));
}

function somaLinhas(linhas) {
  return (linhas || []).reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
}

function somaLinhasNoTotal(linhas) {
  return (linhas || []).reduce(
    (acc, l) => acc + (l.entraNoTotal === false ? 0 : Number(l.valor) || 0),
    0,
  );
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
  [GRUPO.PONTUAIS]: 'Contas pontuais e parceladas',
};

const GRUPO_ORDEM = [
  GRUPO.FIXAS_RECORRENTES,
  GRUPO.FIXAS_ANUAIS,
  GRUPO.FOLHA,
  GRUPO.FOLHA_PROVISOES,
  GRUPO.BUDGETS,
  GRUPO.PONTUAIS,
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
  lancamentosVencimento = [],
  lucroBruto = 0,
  margemDetalhe = null,
}) {
  const { recorrentes, anuais } = montarLinhasFixas(competencia, modelosAgefin, lancamentosAgefin);
  const { folha, provisoes } = montarLinhasFolha(competencia, modelosFolha, competenciasFolha);
  const budgets = montarLinhasBudgets(competencia, modelosBudget, competenciasBudget, lancamentosMes);
  const pontuais = montarLinhasPontuais({
    competencia,
    lancamentosVencimento,
    modelosAgefin,
    modelosFolha,
    competenciasFolha,
    modelosBudget,
  });

  const subtotalFixasRecorrentes = somaLinhas(recorrentes);
  const subtotalAnuaisDiluido = somaLinhas(anuais);
  const subtotalAnuaisVencimento = somaVencimentoAnual(anuais);
  const subtotalFolha = somaLinhas(folha);
  const subtotalProvisoes = somaLinhasNoTotal(provisoes);
  const subtotalBudgets = somaLinhas(budgets);
  const subtotalPontuais = somaLinhas(pontuais);
  const subtotalPontuaisExtraPlano = somaLinhasNoTotal(pontuais);
  const subtotalFretes = somaLinhas(
    pontuais.filter((item) => lancamentoEhFreteItinerario(item.raw)),
  );
  const subtotalComprasMercadoria = somaLinhas(
    pontuais.filter((item) => lancamentoEhCmv(item.raw)),
  );

  const totalOperacional =
    subtotalFixasRecorrentes + subtotalFolha + subtotalBudgets + subtotalPontuaisExtraPlano;
  const totalProvisoesMensais = subtotalAnuaisDiluido + subtotalProvisoes;
  const totalComProvisoes = totalOperacional + totalProvisoesMensais;
  const totalDesembolsoMes =
    subtotalFixasRecorrentes +
    subtotalFolha +
    subtotalPontuais +
    subtotalAnuaisVencimento;

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
    [GRUPO.PONTUAIS]: pontuais,
  };

  const grupos = GRUPO_ORDEM.filter((g) => (mapaItens[g] || []).length > 0).map((g) => ({
    id: g,
    label: GRUPO_LABELS[g],
    items: mapaItens[g],
    subtotal: somaLinhas(mapaItens[g]),
    subtotalNoTotal: somaLinhasNoTotal(mapaItens[g]),
    separadoDoTotal: g === GRUPO.FIXAS_ANUAIS || g === GRUPO.FOLHA_PROVISOES,
    centros: agruparItensCentroCategoria(mapaItens[g]),
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
      pontuais: subtotalPontuais,
      pontuaisExtraPlano: subtotalPontuaisExtraPlano,
      fretesAgendados: subtotalFretes,
      comprasMercadoriaAgendadas: subtotalComprasMercadoria,
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
      capacidadeCompraBase: Number(margemDetalhe?.custo_total) || 0,
      capacidadeCompraDisponivel:
        (Number(margemDetalhe?.custo_total) || 0) - subtotalFretes,
    },
    margemDetalhe,
  };
}
