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
  dataVencimentoCompetencia,
  formatDataBr,
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
  FIXAS_NAO_MENSAIS: 'fixas_nao_mensais',
  FOLHA: 'folha',
  FOLHA_PROVISOES: 'folha_provisoes',
  BUDGETS: 'budgets',
  PONTUAIS: 'pontuais',
};

const CATEGORIA_OCULTA = /^(importação pendente|importacao pendente)$/i;

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
  dataVencimento = '',
  dataVencimentoLabel = '',
  frequencia = '',
  colapsavel = false,
  filhos = [],
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
    categoria: limparCategoria(categoria),
    entraNoTotal,
    coberturaBudget,
    dataVencimento: String(dataVencimento || '').slice(0, 10),
    dataVencimentoLabel: dataVencimentoLabel || (dataVencimento ? formatDataBr(dataVencimento) : ''),
    frequencia: String(frequencia || '').trim(),
    colapsavel,
    filhos: Array.isArray(filhos) ? filhos : [],
    raw,
  };
}

function limparCategoria(categoria) {
  const c = String(categoria || '').trim();
  return CATEGORIA_OCULTA.test(c) ? '' : c;
}

function ehFrequenciaMensal(frequencia) {
  return normalizarFrequenciaSerie(frequencia) === FREQUENCIA_SERIE.MENSAL;
}

function provisaoMensalPorFrequencia(valor, frequencia) {
  const f = normalizarFrequenciaSerie(frequencia);
  const v = Number(valor) || 0;
  switch (f) {
    case FREQUENCIA_SERIE.ANUAL:
      return v / 12;
    case FREQUENCIA_SERIE.SEMESTRAL:
      return v / 6;
    case FREQUENCIA_SERIE.TRIMESTRAL:
      return v / 3;
    case FREQUENCIA_SERIE.BIMESTRAL:
      return v / 2;
    default:
      return v;
  }
}

function labelValorParcela(frequencia) {
  const f = normalizarFrequenciaSerie(frequencia);
  if (f === FREQUENCIA_SERIE.ANUAL) return 'Valor anual';
  return `Valor ${f.toLowerCase()}`;
}

function montarLinhasFixas(competencia, modelosAgefin, lancamentosAgefin) {
  const competencias = montarCompetenciasAgefin(competencia, modelosAgefin, lancamentosAgefin);
  const competenciasMap = Object.fromEntries(competencias.map((comp) => [comp.serie_id, comp]));

  const recorrentes = [];
  const naoMensais = [];

  for (const modelo of modelosAgefin || []) {
    if (!serieEstaAtivaNaCompetencia(modelo, competencia)) continue;

    const frequencia = normalizarFrequenciaSerie(modelo.frequencia);
    const mensal = ehFrequenciaMensal(frequencia);
    if (mensal && !serieDeveAparecerNaCompetencia(modelo, competencia)) continue;

    const comp = competenciasMap[modelo.id];
    const valorParcela = comp ? valorEfetivoCompetencia(comp, modelo) : Number(modelo.valor_previsto) || 0;
    const centroCusto = comp?.centro_custo || modelo.centro_custo || '';
    const categoria = limparCategoria(comp?.categoria_nome || modelo.categoria_nome || '');
    const dataVencimento = dataVencimentoCompetencia(comp, modelo);
    const nome = comp?.serie_nome || modelo.nome;
    const venceNesteMes = serieDeveAparecerNaCompetencia(modelo, competencia);

    if (mensal) {
      recorrentes.push(
        linhaItem({
          id: `fixa-${modelo.id}`,
          grupo: GRUPO.FIXAS_RECORRENTES,
          nome,
          detalhe: '',
          valor: valorParcela,
          link: `/PlanejamentoFinanceiro?competencia=${competencia}`,
          centroCusto,
          categoria,
          dataVencimento,
        }),
      );
    } else {
      naoMensais.push(
        linhaItem({
          id: `nao-mensal-${modelo.id}`,
          grupo: GRUPO.FIXAS_NAO_MENSAIS,
          nome,
          detalhe: '',
          valor: provisaoMensalPorFrequencia(valorParcela, frequencia),
          valorSecundario: valorParcela,
          valorSecundarioLabel: venceNesteMes ? 'Vence neste mês' : labelValorParcela(frequencia),
          link: `/PlanejamentoFinanceiro?competencia=${competencia}`,
          destaque: venceNesteMes,
          centroCusto,
          categoria,
          frequencia,
          dataVencimento,
        }),
      );
    }
  }

  return { recorrentes, naoMensais };
}

function montarLinhasFolha(competencia, modelosFolha, competenciasFolha) {
  const modelosMap = mapaModelosPorColaborador(modelosFolha);
  const competencias = montarCompetenciasFolha(competencia, modelosFolha, competenciasFolha);

  const folha = [];
  const provisoesDetalhe = [];

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
        detalhe: socio ? 'Sócio' : '',
        valor: totais.custoTotalEmpresa,
        link: `/FolhaPrevisao?competencia=${competencia}`,
        centroCusto,
        categoria: categoriaFolha,
      }),
    );

    if (!socio && modelo.decimo_terceiro_ativo !== false && salarioBase > 0) {
      provisoesDetalhe.push(
        linhaItem({
          id: `prov-13-accrual-${comp.colaborador_id}`,
          grupo: GRUPO.FOLHA_PROVISOES,
          nome: comp.colaborador_nome || modelo.nome,
          detalhe: '',
          valor: provisaoMensalPorFrequencia(salarioBase, FREQUENCIA_SERIE.ANUAL),
          link: `/FolhaPrevisao?competencia=${competencia}`,
          centroCusto,
          categoria: '13º salário',
        }),
      );
    }

    if (!socio && salarioBase > 0) {
      provisoesDetalhe.push(
        linhaItem({
          id: `prov-ferias-terco-${comp.colaborador_id}`,
          grupo: GRUPO.FOLHA_PROVISOES,
          nome: comp.colaborador_nome || modelo.nome,
          detalhe: '',
          valor: salarioBase / 36,
          link: `/FolhaPrevisao?competencia=${competencia}`,
          centroCusto,
          categoria: 'Férias',
        }),
      );
    }

    const eventos = calcularProvisoesEventos(comp, modelo);
    for (const ev of eventos) {
      if (ev.categoria === 'decimo_terceiro' || ev.categoria === 'ferias' || ev.categoria === 'rescisao') {
        provisoesDetalhe.push(
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

  return { folha, provisoes: montarLinhasFolhaProvisoesResumo(provisoesDetalhe) };
}

function montarLinhasFolhaProvisoesResumo(provisoesDetalhe = []) {
  const accrual13 = provisoesDetalhe.filter((item) => item.id.startsWith('prov-13-accrual-'));
  const accrualFerias = provisoesDetalhe.filter((item) => item.id.startsWith('prov-ferias-terco-'));
  const eventos = provisoesDetalhe.filter((item) => item.id.startsWith('prov-evento-'));

  const resumo = [];

  if (accrual13.length) {
    resumo.push(
      linhaItem({
        id: 'prov-13-resumo',
        grupo: GRUPO.FOLHA_PROVISOES,
        nome: 'Provisão mensal de 13º',
        valor: somaLinhas(accrual13),
        colapsavel: true,
        filhos: accrual13,
      }),
    );
  }

  if (accrualFerias.length) {
    resumo.push(
      linhaItem({
        id: 'prov-ferias-resumo',
        grupo: GRUPO.FOLHA_PROVISOES,
        nome: 'Provisão mensal de férias',
        valor: somaLinhas(accrualFerias),
        colapsavel: true,
        filhos: accrualFerias,
      }),
    );
  }

  return [...resumo, ...eventos];
}

function montarLinhasBudgets(competencia, modelos, competencias, lancamentos) {
  const visoes = montarVisoesBudgets(modelos, competencia, competencias, lancamentos);
  return visoes.map((v) =>
    linhaItem({
      id: `budget-${v.modelo?.id}`,
      grupo: GRUPO.BUDGETS,
      nome: v.modelo?.nome || 'Budget',
      detalhe: '',
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
        limparCategoria(lancamento.categoria) ||
        (frete ? 'Frete de mercadoria' : cmv ? 'Compra de mercadoria' : '');
      const centroCusto = String(lancamento.centro_custo || '').trim();
      const coberturaBudget = budgetCobertura?.nome || '';
      const dataVencimento = String(lancamento.data_vencimento || '').slice(0, 10);
      const detalhe = [parcela, status, frete ? 'Frete' : '', cmv ? 'CMV' : '', coberturaBudget ? `Budget ${coberturaBudget}` : '']
        .filter(Boolean)
        .join(' · ');

      return linhaItem({
        id: `pontual-${lancamento.id}`,
        grupo: GRUPO.PONTUAIS,
        nome: lancamento.descricao || lancamento.terceiro_nome || 'Conta pontual',
        detalhe,
        valor: valorLancamento(lancamento),
        link: `/AgefinConsulta?competencia=${competencia}`,
        destaque: frete,
        centroCusto,
        categoria,
        dataVencimento,
        entraNoTotal: !budgetCobertura && !cmv,
        coberturaBudget,
        raw: lancamento,
      });
    })
    .sort((a, b) => {
      const cmpData = (a.dataVencimento || '9999-12-31').localeCompare(b.dataVencimento || '9999-12-31');
      if (cmpData !== 0) return cmpData;
      return compararNome(a.nome, b.nome);
    });
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

/** Centro de custo → itens (sem subnível de categoria). */
export function agruparItensCentro(items = []) {
  const centros = new Map();

  for (const item of items) {
    const centro = nomeGrupo(item.centroCusto, 'Sem centro de custo');
    if (!centros.has(centro)) centros.set(centro, []);
    centros.get(centro).push(item);
  }

  return [...centros.entries()]
    .sort(([a], [b]) => {
      if (a === 'Sem centro de custo') return 1;
      if (b === 'Sem centro de custo') return -1;
      return compararNome(a, b);
    })
    .map(([centro, linhas]) => ({
      id: centro,
      label: centro,
      subtotal: somaLinhas(linhas),
      items: [...linhas].sort((a, b) => {
        const cmpData = (a.dataVencimento || '9999-12-31').localeCompare(b.dataVencimento || '9999-12-31');
        if (cmpData !== 0) return cmpData;
        return compararNome(a.nome, b.nome);
      }),
    }));
}

/** Lista plana ordenada por data de vencimento. */
export function agruparItensPorVencimento(items = []) {
  const ordenados = [...items].sort((a, b) => {
    const cmpData = (a.dataVencimento || '9999-12-31').localeCompare(b.dataVencimento || '9999-12-31');
    if (cmpData !== 0) return cmpData;
    return compararNome(a.nome, b.nome);
  });

  return [
    {
      id: 'vencimento',
      label: 'Por vencimento',
      subtotal: somaLinhas(ordenados),
      items: ordenados,
    },
  ];
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

function somaVencimentoNaoMensal(linhas) {
  return (linhas || []).reduce(
    (acc, l) => acc + (l.valorSecundario != null && l.destaque ? Number(l.valorSecundario) || 0 : 0),
    0,
  );
}

function montarAnexoNaoMensais(itens = []) {
  return [...itens]
    .sort((a, b) => compararNome(a.nome, b.nome))
    .map((item) => ({
      id: item.id,
      nome: item.nome,
      frequencia: item.frequencia,
      provisaoMensal: item.valor,
      valorParcela: item.valorSecundario,
      venceNesteMes: item.destaque,
      dataVencimento: item.dataVencimento,
      dataVencimentoLabel: item.dataVencimentoLabel,
      centroCusto: item.centroCusto,
    }));
}

const GRUPO_LABELS = {
  [GRUPO.FIXAS_RECORRENTES]: 'Contas fixas (recorrentes)',
  [GRUPO.FIXAS_NAO_MENSAIS]: 'Contas não mensais (provisão mensal)',
  [GRUPO.FOLHA]: 'Folha de pagamento',
  [GRUPO.FOLHA_PROVISOES]: 'Provisões de folha',
  [GRUPO.BUDGETS]: 'Budgets',
  [GRUPO.PONTUAIS]: 'Contas pontuais e parceladas',
};

const GRUPO_ORDEM = [
  GRUPO.FIXAS_RECORRENTES,
  GRUPO.FIXAS_NAO_MENSAIS,
  GRUPO.FOLHA,
  GRUPO.FOLHA_PROVISOES,
  GRUPO.BUDGETS,
  GRUPO.PONTUAIS,
];

function layoutGrupo(grupoId) {
  switch (grupoId) {
    case GRUPO.FIXAS_RECORRENTES:
      return 'vencimento_ou_centro';
    case GRUPO.FIXAS_NAO_MENSAIS:
      return 'lista';
    case GRUPO.FOLHA_PROVISOES:
      return 'provisoes_colapsaveis';
    case GRUPO.BUDGETS:
      return 'centro_categoria';
    case GRUPO.PONTUAIS:
      return 'vencimento';
    default:
      return 'centro_categoria';
  }
}

function montarAgrupamentosGrupo(grupoId, items = []) {
  switch (layoutGrupo(grupoId)) {
    case 'vencimento_ou_centro':
      return {
        porVencimento: agruparItensPorVencimento(items),
        porCentro: agruparItensCentro(items),
      };
    case 'lista':
      return { lista: agruparItensPorVencimento(items) };
    case 'provisoes_colapsaveis':
      return { lista: [{ id: 'provisoes', label: 'Provisões', subtotal: somaLinhas(items), items }] };
    case 'vencimento':
      return { porVencimento: agruparItensPorVencimento(items) };
    case 'centro_categoria':
    default:
      return { porCentroCategoria: agruparItensCentroCategoria(items) };
  }
}

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
  const { recorrentes, naoMensais } = montarLinhasFixas(competencia, modelosAgefin, lancamentosAgefin);
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
  const subtotalNaoMensaisDiluido = somaLinhas(naoMensais);
  const subtotalNaoMensaisVencimento = somaVencimentoNaoMensal(naoMensais);
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
  const totalProvisoesMensais = subtotalNaoMensaisDiluido + subtotalProvisoes;
  const totalComProvisoes = totalOperacional + totalProvisoesMensais;
  const totalDesembolsoMes =
    subtotalFixasRecorrentes +
    subtotalFolha +
    subtotalPontuais +
    subtotalNaoMensaisVencimento;

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
    [GRUPO.FIXAS_NAO_MENSAIS]: naoMensais,
    [GRUPO.FOLHA]: folha,
    [GRUPO.FOLHA_PROVISOES]: provisoes,
    [GRUPO.BUDGETS]: budgets,
    [GRUPO.PONTUAIS]: pontuais,
  };

  const grupos = GRUPO_ORDEM.filter((g) => (mapaItens[g] || []).length > 0).map((g) => {
    const agrupamentos = montarAgrupamentosGrupo(g, mapaItens[g]);
    return {
      id: g,
      label: GRUPO_LABELS[g],
      layout: layoutGrupo(g),
      items: mapaItens[g],
      subtotal: somaLinhas(mapaItens[g]),
      subtotalNoTotal: somaLinhasNoTotal(mapaItens[g]),
      separadoDoTotal:
        g === GRUPO.FIXAS_NAO_MENSAIS || g === GRUPO.FOLHA_PROVISOES,
      ...agrupamentos,
      centros: agrupamentos.porCentroCategoria || agrupamentos.porCentro || [],
    };
  });

  return {
    competencia,
    grupos,
    anexoNaoMensais: montarAnexoNaoMensais(naoMensais),
    resumo: {
      fixasRecorrentes: subtotalFixasRecorrentes,
      anuaisDiluido: subtotalNaoMensaisDiluido,
      anuaisVencimentoMes: subtotalNaoMensaisVencimento,
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
