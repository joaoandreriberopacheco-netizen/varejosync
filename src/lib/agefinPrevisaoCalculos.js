/**
 * AGFIM — motor de programação de contas fixas (espelho da Folha de previsão).
 */

import { tagsOrigemBoleto } from '@/lib/agefinLancamentosRecorrencia';
import { lancamentoPago, lancamentoCancelado } from '@/lib/agefinConsultaFilters';

export const SITUACAO_SERIE = {
  ATIVA: 'ativa',
  ENCERRADA: 'encerrada',
};

export const SITUACAO_SERIE_LABELS = {
  ativa: 'Ativa',
  encerrada: 'Encerrada',
};

export function gerarGrupoLancamentoId() {
  return `grp-agefin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function gerarSerieId() {
  return `serie-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

export function dataHojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function shiftCompetencia(competencia, delta) {
  const [y, m] = competencia.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function ultimoDiaCompetencia(competencia) {
  const [y, m] = String(competencia).slice(0, 7).split('-').map(Number);
  if (!y || !m) return null;
  const ultimo = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`;
}

export function competenciaDeveEstarFechada(competencia, hojeIso = dataHojeIso()) {
  const fim = ultimoDiaCompetencia(competencia);
  return fim ? hojeIso > fim : false;
}

export function dataVencimentoNaCompetencia(competencia, diaVencimento = 10) {
  const [y, m] = String(competencia).slice(0, 7).split('-').map(Number);
  if (!y || !m) return null;
  const dim = new Date(y, m, 0).getDate();
  const dia = Math.min(Math.max(1, Number(diaVencimento) || 10), dim);
  return `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function formatCicloAgefinCompetencia(competencia, diaVencimento = 10) {
  const fim = ultimoDiaCompetencia(competencia);
  const venc = dataVencimentoNaCompetencia(competencia, diaVencimento);
  if (!fim || !venc) return '';
  return `Competência ${formatDataBr(fim)} · Vence ${formatDataBr(venc)}`;
}

export function formatCurrency(value) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function isCompetenciaPlanejamento(comp) {
  return Boolean(comp?._modoPlanejamento);
}

export function isCompetenciaFutura(competencia, ref = getCompetenciaAtual()) {
  return String(competencia).slice(0, 7) > ref;
}

export function serieEstaAtivaNaCompetencia(modelo, competencia) {
  if (!modelo || modelo.ativo === false) return false;
  if ((modelo.situacao || SITUACAO_SERIE.ATIVA) === SITUACAO_SERIE.ENCERRADA) {
    const enc = String(modelo.data_encerramento || '').slice(0, 7);
    if (enc && competencia > enc) return false;
  }
  return true;
}

export function valorEfetivoCompetencia(comp, modelo) {
  if (comp?.valor_real != null && Number(comp.valor_real) > 0) return Number(comp.valor_real);
  if (comp?.valor_previsto != null) return Number(comp.valor_previsto);
  return Number(modelo?.valor_previsto) || 0;
}

export function statusCompetenciaEfetivo(comp, hojeIso = dataHojeIso()) {
  if (!comp) return 'rascunho';
  if (comp._modoPlanejamento) return 'planejamento';
  if (comp.status === 'fechado') return 'fechado';
  if (lancamentoPago(comp._lancamento)) return 'fechado';
  if (lancamentoCancelado(comp._lancamento)) return 'cancelado';
  if (competenciaDeveEstarFechada(comp.competencia, hojeIso)) return 'fechado';
  return 'rascunho';
}

export function competenciaEstaFechada(comp, hojeIso = dataHojeIso()) {
  if (comp?._modoPlanejamento) return false;
  return statusCompetenciaEfetivo(comp, hojeIso) === 'fechado';
}

export function criarCompetenciaPlanejada(modelo, competencia) {
  const dia = Number(modelo.dia_vencimento) || 10;
  return {
    id: `planej-${modelo.id}-${competencia}`,
    serie_id: modelo.id,
    serie_nome: modelo.nome,
    terceiro_nome: modelo.terceiro_nome,
    categoria_nome: modelo.categoria_nome,
    centro_custo: modelo.centro_custo,
    competencia,
    dia_vencimento: dia,
    valor_previsto: Number(modelo.valor_previsto) || 0,
    valor_real: null,
    status: 'rascunho',
    grupo_lancamento_id: modelo.grupo_lancamento_id,
    lancamento_id: null,
    origem_boleto: null,
    _modoPlanejamento: true,
    _lancamento: null,
  };
}

export function competenciaFromLancamento(lf, modelo, competencia) {
  const dia = Number(modelo?.dia_vencimento) || Number((lf.data_vencimento || '').slice(8, 10)) || 10;
  return {
    id: lf.id,
    serie_id: modelo?.id,
    serie_nome: modelo?.nome || lf.descricao,
    terceiro_nome: lf.terceiro_nome || modelo?.terceiro_nome,
    categoria_nome: lf.categoria || modelo?.categoria_nome,
    centro_custo: modelo?.centro_custo,
    competencia,
    dia_vencimento: dia,
    valor_previsto: Number(modelo?.valor_previsto) || Number(lf.valor) || 0,
    valor_real: Number(lf.valor) || 0,
    status: lancamentoPago(lf) ? 'fechado' : 'rascunho',
    grupo_lancamento_id: lf.grupo_lancamento_id,
    lancamento_id: lf.id,
    origem_boleto: tagsOrigemBoleto(lf.tags),
    _modoPlanejamento: false,
    _lancamento: lf,
  };
}

/**
 * Mescla lançamentos do mês com linhas de planejamento (séries ativas sem LF no mês).
 */
export function montarCompetenciasVisao(competenciaMes, modelos, lancamentosMes = []) {
  const bySerie = {};
  const lfByGrupo = {};
  for (const lf of lancamentosMes || []) {
    const gid = lf.grupo_lancamento_id;
    if (gid) lfByGrupo[gid] = lf;
  }

  for (const modelo of modelos || []) {
    if (!serieEstaAtivaNaCompetencia(modelo, competenciaMes)) continue;
    const lf = modelo.grupo_lancamento_id ? lfByGrupo[modelo.grupo_lancamento_id] : null;
    if (lf) {
      bySerie[modelo.id] = competenciaFromLancamento(lf, modelo, competenciaMes);
    } else {
      bySerie[modelo.id] = criarCompetenciaPlanejada(modelo, competenciaMes);
    }
  }

  return Object.values(bySerie).sort((a, b) =>
    (a.serie_nome || '').localeCompare(b.serie_nome || '', 'pt-BR'),
  );
}

export function mapaModelosPorId(modelos) {
  const map = {};
  for (const m of modelos || []) {
    if (m?.id) map[m.id] = m;
  }
  return map;
}

export function filtrarCompetenciasPrevisao(competencias, { busca = '', centro = '__todos__' } = {}) {
  const q = busca.trim().toLowerCase();
  return (competencias || []).filter((c) => {
    if (q) {
      const text = `${c.serie_nome || ''} ${c.terceiro_nome || ''} ${c.categoria_nome || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    if (centro === '__todos__') return true;
    const cc = String(c.centro_custo || '').trim();
    if (centro === '__sem__') return !cc;
    return cc.toLocaleLowerCase('pt-BR') === centro.toLocaleLowerCase('pt-BR');
  });
}

export function agruparCompetenciasPorCentroCusto(competencias, centrosRegistrados = []) {
  const centrosSet = new Set((centrosRegistrados || []).map((c) => c.toLocaleLowerCase('pt-BR')));
  const grupos = {};
  for (const c of competencias || []) {
    const cc = String(c.centro_custo || '').trim();
    const chave =
      cc && centrosSet.has(cc.toLocaleLowerCase('pt-BR')) ? cc : '__sem__';
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(c);
  }
  const ordem = [...centrosRegistrados, '__sem__'];
  return ordem
    .filter((k) => grupos[k]?.length)
    .map((chave) => ({
      chave,
      label: chave === '__sem__' ? 'Sem centro de custo' : chave,
      items: grupos[chave],
    }));
}

export function calcularTotaisGrupo(competencias, modelosMap = {}) {
  let total = 0;
  let comBoleto = 0;
  let semBoleto = 0;
  let planejamento = 0;
  let vencidas = 0;
  const hoje = dataHojeIso();

  for (const c of competencias || []) {
    const modelo = modelosMap[c.serie_id];
    const valor = valorEfetivoCompetencia(c, modelo);
    total += valor;
    if (isCompetenciaPlanejamento(c)) {
      planejamento += 1;
      continue;
    }
    if (c.origem_boleto === 'pdf') comBoleto += 1;
    else semBoleto += 1;
    const venc = c._lancamento?.data_vencimento?.slice(0, 10);
    if (venc && venc < hoje && !lancamentoPago(c._lancamento)) vencidas += 1;
  }

  return {
    total,
    count: competencias?.length || 0,
    comBoleto,
    semBoleto,
    planejamento,
    vencidas,
  };
}

export function ordenarSeriesPorCentroENome(series) {
  return [...(series || [])].sort((a, b) => {
    const ca = String(a.centro_custo || '').toLocaleLowerCase('pt-BR');
    const cb = String(b.centro_custo || '').toLocaleLowerCase('pt-BR');
    if (ca !== cb) {
      if (!ca) return 1;
      if (!cb) return -1;
      return ca.localeCompare(cb, 'pt-BR');
    }
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
  });
}

/** Projeção de 12 meses a partir das séries ativas. */
export function calcularProjecaoAgefin(modelos, competenciaInicio) {
  const meses = [];
  let comp = competenciaInicio;
  for (let i = 0; i < 12; i += 1) {
    let total = 0;
    let count = 0;
    for (const m of modelos || []) {
      if (!serieEstaAtivaNaCompetencia(m, comp)) continue;
      total += Number(m.valor_previsto) || 0;
      count += 1;
    }
    meses.push({ competencia: comp, total, count });
    comp = shiftCompetencia(comp, 1);
  }
  const totalAno = meses.reduce((s, x) => s + x.total, 0);
  return { meses, totalAno };
}

export function criarSerieComDefaults(partial = {}) {
  return {
    id: partial.id || gerarSerieId(),
    nome: partial.nome || '',
    terceiro_nome: partial.terceiro_nome || '',
    terceiro_id: partial.terceiro_id || '',
    categoria_id: partial.categoria_id || '',
    categoria_nome: partial.categoria_nome || '',
    centro_custo: partial.centro_custo || '',
    valor_previsto: Number(partial.valor_previsto) || 0,
    dia_vencimento: Number(partial.dia_vencimento) || 10,
    frequencia: partial.frequencia || 'Mensal',
    grupo_lancamento_id: partial.grupo_lancamento_id || gerarGrupoLancamentoId(),
    ativo: partial.ativo !== false,
    situacao: partial.situacao || SITUACAO_SERIE.ATIVA,
    data_encerramento: partial.data_encerramento || null,
    observacoes: partial.observacoes || '',
  };
}
