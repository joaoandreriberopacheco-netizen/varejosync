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
};

export const MOVIMENTO_LABELS = {
  vale: 'Vale / adiantamento',
  hora_extra: 'Hora extra',
  comissao_venda: 'Comissão / venda',
  ajuste_provento: 'Ajuste (+)',
  ajuste_desconto: 'Ajuste (−)',
};

export const RUBRICA_LABELS = {
  provento: 'Provento',
  desconto: 'Desconto',
  encargo_empresa: 'Encargo empresa',
};

/** Rubricas padrão para novo modelo (duplicar e ajustar) */
export const RUBRICAS_MODELO_PADRAO = [
  { tipo: 'provento', nome: 'Salário base', valor_base: 0, ordem: 1 },
  { tipo: 'provento', nome: 'Comissões', valor_base: 0, ordem: 2 },
  { tipo: 'desconto', nome: 'INSS', valor_base: 0, ordem: 3 },
  { tipo: 'encargo_empresa', nome: 'FGTS', valor_base: 0, ordem: 4 },
  { tipo: 'encargo_empresa', nome: 'INSS patronal', valor_base: 0, ordem: 5 },
];

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

export function getCompetenciaAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftCompetencia(competencia, delta) {
  const [y, m] = competencia.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatCurrency(value) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
 * Calcula totais de uma competência.
 * - proventos: rubricas provento + HE + ajustes +
 * - descontos: rubricas desconto + vales + comissões + ajustes −
 * - encargos: FGTS, INSS patronal (custo empresa, não desconta do líquido)
 * - liquido: proventos − descontos
 * - custo_total_empresa: liquido + encargos
 */
export function calcularTotaisCompetencia(competencia) {
  const rubricas = competencia?.rubricas || [];
  const movimentos = competencia?.movimentos || [];

  const proventosFixos = sumRubricas(rubricas, RUBRICA_TIPOS.PROVENTO);
  const descontosFixos = sumRubricas(rubricas, RUBRICA_TIPOS.DESCONTO);
  const encargosEmpresa = sumRubricas(rubricas, RUBRICA_TIPOS.ENCARGO_EMPRESA);

  const movProventos =
    sumMovimentos(movimentos, [MOVIMENTO_TIPOS.HORA_EXTRA, MOVIMENTO_TIPOS.AJUSTE_PROVENTO]);
  const movDescontos = sumMovimentos(movimentos, [
    MOVIMENTO_TIPOS.VALE,
    MOVIMENTO_TIPOS.COMISSAO_VENDA,
    MOVIMENTO_TIPOS.AJUSTE_DESCONTO,
  ]);

  const proventos = proventosFixos + movProventos;
  const descontos = descontosFixos + movDescontos;
  const liquido = proventos - descontos;
  const custoTotalEmpresa = liquido + encargosEmpresa;

  const totalVales = sumMovimentos(movimentos, [MOVIMENTO_TIPOS.VALE]);
  const totalHorasExtra = sumMovimentos(movimentos, [MOVIMENTO_TIPOS.HORA_EXTRA]);
  const totalComissoes = sumMovimentos(movimentos, [MOVIMENTO_TIPOS.COMISSAO_VENDA]);

  return {
    proventosFixos,
    descontosFixos,
    encargosEmpresa,
    movProventos,
    movDescontos,
    proventos,
    descontos,
    liquido,
    custoTotalEmpresa,
    totalVales,
    totalHorasExtra,
    totalComissoes,
  };
}

/** Agrega totais de várias competências (visão agrupada do mês) */
export function calcularTotaisGrupo(competencias) {
  const lista = Array.isArray(competencias) ? competencias : [];
  return lista.reduce(
    (acc, c) => {
      const t = calcularTotaisCompetencia(c);
      acc.proventos += t.proventos;
      acc.descontos += t.descontos;
      acc.liquido += t.liquido;
      acc.encargosEmpresa += t.encargosEmpresa;
      acc.custoTotalEmpresa += t.custoTotalEmpresa;
      acc.totalVales += t.totalVales;
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
      count: 0,
    },
  );
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
