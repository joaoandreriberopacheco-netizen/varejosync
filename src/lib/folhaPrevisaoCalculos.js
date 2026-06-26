/** Tipos de rubrica fixa no modelo/competência */
export const RUBRICA_TIPOS = {
  PROVENTO: 'provento',
  DESCONTO: 'desconto',
  ENCARGO_EMPRESA: 'encargo_empresa',
};

/** Movimentos variáveis durante o mês */
export const MOVIMENTO_TIPOS = {
  VALE: 'vale',
  HORA_EXTRA: 'hora_extra',
  COMISSAO_VENDA: 'comissao_venda',
  AJUSTE_PROVENTO: 'ajuste_provento',
  AJUSTE_DESCONTO: 'ajuste_desconto',
  FERIAS: 'ferias',
};

export const MOVIMENTO_LABELS = {
  vale: 'Vale / adiantamento',
  hora_extra: 'Hora extra',
  comissao_venda: 'Comissão / venda',
  ajuste_provento: 'Ajuste (+)',
  ajuste_desconto: 'Ajuste (−)',
  ferias: 'Férias',
};

export const RUBRICA_LABELS = {
  provento: 'Provento',
  desconto: 'Desconto',
  encargo_empresa: 'Encargo empresa',
};

export const SITUACAO_FOLHA = {
  ATIVO: 'ativo',
  DESLIGADO: 'desligado',
};

export const SITUACAO_FOLHA_LABELS = {
  ativo: 'Ativo',
  desligado: 'Desligou',
};

/** Rubricas padrão para novo modelo (duplicar e ajustar) */
export const RUBRICAS_MODELO_PADRAO = [
  { tipo: 'provento', nome: 'Salário base', valor_base: 0, ordem: 1 },
  { tipo: 'provento', nome: 'Comissões', valor_base: 0, ordem: 2 },
  { tipo: 'desconto', nome: 'INSS', valor_base: 0, ordem: 3 },
  { tipo: 'encargo_empresa', nome: 'FGTS', valor_base: 0, ordem: 4 },
  { tipo: 'encargo_empresa', nome: 'INSS patronal', valor_base: 0, ordem: 5 },
];

export const DECIMO_PADRAO = {
  decimo_terceiro_ativo: true,
  decimo_mes_parcela_1: 11,
  decimo_mes_parcela_2: 12,
  decimo_percentual_parcela: 50,
};

export function gerarIdInterno(prefix = 'rub') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function gerarGrupoLancamentoId() {
  return `grp-folha-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatCompetenciaLabel(competencia) {
  if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) return competencia || '';
  const [y, m] = competencia.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[Number(m) - 1]}/${y}`;
}

export function formatDataBr(data) {
  if (!data) return '';
  const s = String(data).slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

export function getCompetenciaAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftCompetencia(competencia, delta) {
  const [y, m] = competencia.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function competenciaParaMes(competencia) {
  return parseInt(String(competencia).slice(5, 7), 10);
}

export function formatCurrency(value) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Salário base = rubrica "Salário base" ou maior provento fixo */
export function obterSalarioBase(rubricas) {
  const lista = rubricas || [];
  const salario = lista.find(
    (r) => r.tipo === RUBRICA_TIPOS.PROVENTO && /sal[aá]rio/i.test(r.nome || ''),
  );
  if (salario) return Number(salario.valor_base) || 0;
  const proventos = lista.filter((r) => r.tipo === RUBRICA_TIPOS.PROVENTO);
  if (!proventos.length) return 0;
  return Math.max(...proventos.map((r) => Number(r.valor_base) || 0));
}

export function modeloEstaAtivoNaCompetencia(modelo, competencia) {
  if (!modelo) return true;
  if (modelo.situacao === SITUACAO_FOLHA.DESLIGADO && modelo.data_desligamento) {
    const mesDeslig = String(modelo.data_desligamento).slice(0, 7);
    return competencia <= mesDeslig;
  }
  return modelo.ativo !== false && modelo.situacao !== SITUACAO_FOLHA.DESLIGADO;
}

export function isMesDesligamento(modelo, competencia) {
  if (!modelo?.data_desligamento) return false;
  return String(modelo.data_desligamento).slice(0, 7) === competencia;
}

function sumRubricas(rubricas, tipo) {
  return (rubricas || [])
    .filter((r) => r.tipo === tipo)
    .reduce((acc, r) => acc + (Number(r.valor_base) || 0), 0);
}

function sumMovimentos(movimentos, tipos) {
  return (movimentos || [])
    .filter((m) => tipos.includes(m.tipo))
    .reduce((acc, m) => acc + Math.abs(Number(m.valor) || 0), 0);
}

/**
 * Provisões automáticas: 13º (nov/dez), férias programadas, rescisão no desligamento.
 */
export function calcularProvisoesEventos(competencia, modelo) {
  const provisoes = [];
  if (!modelo) return provisoes;

  const competenciaStr = typeof competencia === 'string' ? competencia : competencia?.competencia;
  if (!competenciaStr) return provisoes;

  const rubricas = competencia?.rubricas || modelo?.rubricas || [];
  const salarioBase = obterSalarioBase(rubricas);
  const mesNum = competenciaParaMes(competenciaStr);

  if (modelo.decimo_terceiro_ativo !== false && salarioBase > 0) {
    const p1 = modelo.decimo_mes_parcela_1 ?? DECIMO_PADRAO.decimo_mes_parcela_1;
    const p2 = modelo.decimo_mes_parcela_2 ?? DECIMO_PADRAO.decimo_mes_parcela_2;
    const pct = (modelo.decimo_percentual_parcela ?? DECIMO_PADRAO.decimo_percentual_parcela) / 100;

    if (mesNum === p1) {
      provisoes.push({
        id: `decimo-1-${competenciaStr}`,
        tipo: 'provento',
        nome: '13º salário — 1ª parcela',
        valor: salarioBase * pct,
        categoria: 'decimo_terceiro',
      });
    }
    if (mesNum === p2) {
      provisoes.push({
        id: `decimo-2-${competenciaStr}`,
        tipo: 'provento',
        nome: '13º salário — 2ª parcela',
        valor: salarioBase * pct,
        categoria: 'decimo_terceiro',
      });
    }
  }

  for (const f of modelo.ferias_programadas || []) {
    if (f.status === 'cancelado') continue;
    if (f.competencia_prevista === competenciaStr) {
      provisoes.push({
        id: f.id || `ferias-${f.competencia_prevista}`,
        tipo: 'provento',
        nome: f.descricao || 'Férias',
        valor: Number(f.valor_previsto) || 0,
        categoria: 'ferias',
      });
    }
  }

  if (isMesDesligamento(modelo, competenciaStr)) {
    const rescisao = Number(modelo.valor_rescisao_previsto) || 0;
    if (rescisao > 0) {
      provisoes.push({
        id: `rescisao-${competenciaStr}`,
        tipo: 'provento',
        nome: 'Rescisão / verbas (previsto)',
        valor: rescisao,
        categoria: 'rescisao',
      });
    }
  }

  return provisoes;
}

/**
 * Calcula totais de uma competência (inclui 13º, férias e rescisão via modelo).
 */
export function calcularTotaisCompetencia(competencia, modelo = null) {
  const rubricas = competencia?.rubricas || [];
  const movimentos = competencia?.movimentos || [];
  const provisoes = calcularProvisoesEventos(competencia, modelo);

  const proventosFixos = sumRubricas(rubricas, RUBRICA_TIPOS.PROVENTO);
  const descontosFixos = sumRubricas(rubricas, RUBRICA_TIPOS.DESCONTO);
  const encargosEmpresa = sumRubricas(rubricas, RUBRICA_TIPOS.ENCARGO_EMPRESA);

  const proventosEventos = provisoes
    .filter((p) => p.tipo === 'provento')
    .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);

  const movProventos = sumMovimentos(movimentos, [
    MOVIMENTO_TIPOS.HORA_EXTRA,
    MOVIMENTO_TIPOS.AJUSTE_PROVENTO,
    MOVIMENTO_TIPOS.FERIAS,
  ]);
  const movDescontos = sumMovimentos(movimentos, [
    MOVIMENTO_TIPOS.VALE,
    MOVIMENTO_TIPOS.COMISSAO_VENDA,
    MOVIMENTO_TIPOS.AJUSTE_DESCONTO,
  ]);

  const proventos = proventosFixos + proventosEventos + movProventos;
  const descontos = descontosFixos + movDescontos;
  const liquido = proventos - descontos;
  const custoTotalEmpresa = liquido + encargosEmpresa;

  const totalVales = sumMovimentos(movimentos, [MOVIMENTO_TIPOS.VALE]);
  const totalHorasExtra = sumMovimentos(movimentos, [MOVIMENTO_TIPOS.HORA_EXTRA]);
  const totalComissoes = sumMovimentos(movimentos, [MOVIMENTO_TIPOS.COMISSAO_VENDA]);
  const totalDecimo = provisoes
    .filter((p) => p.categoria === 'decimo_terceiro')
    .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
  const totalFerias = provisoes
    .filter((p) => p.categoria === 'ferias')
    .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);

  return {
    proventosFixos,
    descontosFixos,
    encargosEmpresa,
    proventosEventos,
    movProventos,
    movDescontos,
    proventos,
    descontos,
    liquido,
    custoTotalEmpresa,
    totalVales,
    totalHorasExtra,
    totalComissoes,
    totalDecimo,
    totalFerias,
    provisoes,
    desligado: modelo?.situacao === SITUACAO_FOLHA.DESLIGADO,
    mesDesligamento: isMesDesligamento(modelo, competencia?.competencia),
  };
}

/** Agrega totais de várias competências com mapa de modelos por colaborador */
export function calcularTotaisGrupo(competencias, modelosPorColaborador = {}) {
  const lista = Array.isArray(competencias) ? competencias : [];
  return lista.reduce(
    (acc, c) => {
      const modelo = modelosPorColaborador[c.colaborador_id] || null;
      const t = calcularTotaisCompetencia(c, modelo);
      acc.proventos += t.proventos;
      acc.descontos += t.descontos;
      acc.liquido += t.liquido;
      acc.encargosEmpresa += t.encargosEmpresa;
      acc.custoTotalEmpresa += t.custoTotalEmpresa;
      acc.totalVales += t.totalVales;
      acc.totalDecimo += t.totalDecimo;
      acc.totalFerias += t.totalFerias;
      if (t.desligado) acc.desligados += 1;
      acc.count += 1;
      return acc;
    },
    {
      proventos: 0,
      descontos: 0,
      liquido: 0,
      encargosEmpresa: 0,
      custoTotalEmpresa: 0,
      totalVales: 0,
      totalDecimo: 0,
      totalFerias: 0,
      desligados: 0,
      count: 0,
    },
  );
}

/** Projeção de caixa: soma custo por mês para todos os modelos ativos */
export function calcularProjecaoCaixa(modelos, meses = 12, competenciaInicio = null) {
  const inicio = competenciaInicio || getCompetenciaAtual();
  const modelosVinculados = (modelos || []).filter((m) => m.colaborador_id && m.ativo !== false);

  const linhas = [];
  for (let i = 0; i < meses; i += 1) {
    const competencia = shiftCompetencia(inicio, i);
    let liquido = 0;
    let custoTotal = 0;
    let decimo = 0;
    let ferias = 0;
    let ativos = 0;

    for (const modelo of modelosVinculados) {
      if (!modeloEstaAtivoNaCompetencia(modelo, competencia)) continue;
      ativos += 1;
      const fakeComp = {
        competencia,
        rubricas: modelo.rubricas || [],
        movimentos: [],
      };
      const t = calcularTotaisCompetencia(fakeComp, modelo);
      liquido += t.liquido;
      custoTotal += t.custoTotalEmpresa;
      decimo += t.totalDecimo;
      ferias += t.totalFerias;
    }

    linhas.push({ competencia, liquido, custoTotal, decimo, ferias, ativos });
  }
  return linhas;
}

export function mapaModelosPorColaborador(modelos) {
  const map = {};
  for (const m of modelos || []) {
    if (m.colaborador_id) map[m.colaborador_id] = m;
  }
  return map;
}

export function clonarRubricas(rubricas) {
  return (rubricas || []).map((r) => ({
    ...r,
    id: gerarIdInterno('rub'),
  }));
}

export function criarRubricasPadrao() {
  return RUBRICAS_MODELO_PADRAO.map((r) => ({
    ...r,
    id: gerarIdInterno('rub'),
  }));
}

export function criarModeloComDefaults(extra = {}) {
  return {
    dia_vencimento: 5,
    ativo: true,
    situacao: SITUACAO_FOLHA.ATIVO,
    ...DECIMO_PADRAO,
    ferias_programadas: [],
    rubricas: criarRubricasPadrao(),
    ...extra,
  };
}
