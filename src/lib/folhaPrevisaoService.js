import { base44 } from '@/api/base44Client';
import {
  calcularTotaisCompetencia,
  clonarRubricas,
  criarModeloComDefaults,
  criarRubricasPadrao,
  competenciaDeveEstarFechada,
  competenciaEstaFechada,
  dataVencimentoPagamentoFolha,
  FOLHA_DIA_VENCIMENTO,
  gerarGrupoLancamentoId,
  gerarIdInterno,
  isMesDesligamento,
  modeloEstaAtivoNaCompetencia,
  SITUACAO_FOLHA,
} from '@/lib/folhaPrevisaoCalculos';

export async function listarModelos() {
  return base44.entities.FolhaPrevisaoModelo.list('-created_date');
}

export async function listarCompetencias(competencia) {
  if (competencia) {
    return base44.entities.FolhaPrevisaoCompetencia.filter({ competencia }, '-colaborador_nome');
  }
  return base44.entities.FolhaPrevisaoCompetencia.list('-created_date');
}

export async function listarColaboradoresAtivos() {
  const todos = await base44.entities.Colaborador.list();
  return (todos || []).filter((c) => c.ativo !== false);
}

export function resolverModeloColaborador(modelos, colaboradorId) {
  const ativos = (modelos || []).filter((m) => m.ativo !== false);
  return (
    ativos.find((m) => m.colaborador_id === colaboradorId) ||
    ativos.find((m) => !m.colaborador_id) ||
    ativos[0] ||
    null
  );
}

/** Duplica um modelo existente (padrão "irmão") */
export async function duplicarModelo(modelo, overrides = {}) {
  const rubricas = clonarRubricas(modelo?.rubricas?.length ? modelo.rubricas : criarRubricasPadrao());
  return base44.entities.FolhaPrevisaoModelo.create(
    criarModeloComDefaults({
      nome: overrides.nome || `${modelo?.nome || 'Modelo'} (cópia)`,
      descricao: modelo?.descricao || '',
      colaborador_id: overrides.colaborador_id ?? modelo?.colaborador_id ?? '',
      colaborador_nome: overrides.colaborador_nome ?? modelo?.colaborador_nome ?? '',
      dia_vencimento: FOLHA_DIA_VENCIMENTO,
      decimo_terceiro_ativo: modelo?.decimo_terceiro_ativo,
      decimo_mes_parcela_1: modelo?.decimo_mes_parcela_1,
      decimo_mes_parcela_2: modelo?.decimo_mes_parcela_2,
      decimo_percentual_parcela: modelo?.decimo_percentual_parcela,
      ferias_programadas: clonarFerias(modelo?.ferias_programadas),
      tipo_vinculo: modelo?.tipo_vinculo,
      retirada_frequencia: modelo?.retirada_frequencia,
      retirada_valor_fixo: modelo?.retirada_valor_fixo,
      rubricas,
      situacao: SITUACAO_FOLHA.ATIVO,
      data_desligamento: '',
      valor_rescisao_previsto: 0,
      ...overrides,
    }),
  );
}

function clonarFerias(ferias) {
  return (ferias || []).map((f) => ({ ...f, id: gerarIdInterno('fer') }));
}

export async function criarModeloPadrao(nome = 'Modelo padrão') {
  return base44.entities.FolhaPrevisaoModelo.create(criarModeloComDefaults({ nome }));
}

/** Registra desligamento — para de gerar meses futuros */
export async function registrarDesligamento(modeloId, { data_desligamento, valor_rescisao_previsto = 0, observacoes }) {
  const modelo = await base44.entities.FolhaPrevisaoModelo.update(modeloId, {
    situacao: SITUACAO_FOLHA.DESLIGADO,
    data_desligamento,
    valor_rescisao_previsto: Number(valor_rescisao_previsto) || 0,
    observacoes_desligamento: observacoes || '',
  });

  const mesDeslig = String(data_desligamento).slice(0, 7);
  const existentes = await base44.entities.FolhaPrevisaoCompetencia.filter({
    colaborador_id: modelo.colaborador_id,
    competencia: mesDeslig,
  });

  if (existentes?.length) {
    await base44.entities.FolhaPrevisaoCompetencia.update(existentes[0].id, {
      situacao_mes: 'ultimo_mes',
      observacoes: observacoes || existentes[0].observacoes,
    });
  }

  return modelo;
}

/** Reativa colaborador na previsão de folha */
export async function reativarNaFolha(modeloId) {
  return base44.entities.FolhaPrevisaoModelo.update(modeloId, {
    situacao: SITUACAO_FOLHA.ATIVO,
    data_desligamento: '',
    valor_rescisao_previsto: 0,
    observacoes_desligamento: '',
  });
}

/** Garante competência do mês para um colaborador a partir de um modelo */
export async function garantirCompetencia({ colaborador, modelo, competencia }) {
  if (modelo && !modeloEstaAtivoNaCompetencia(modelo, competencia)) {
    return null;
  }

  const existentes = await base44.entities.FolhaPrevisaoCompetencia.filter({
    colaborador_id: colaborador.id,
    competencia,
  });
  if (existentes?.length) return existentes[0];

  const rubricas = clonarRubricas(modelo?.rubricas?.length ? modelo.rubricas : criarRubricasPadrao());
  const situacaoMes = isMesDesligamento(modelo, competencia) ? 'ultimo_mes' : 'normal';

  return base44.entities.FolhaPrevisaoCompetencia.create({
    colaborador_id: colaborador.id,
    colaborador_nome: colaborador.nome,
    tipo_vinculo: modelo?.tipo_vinculo || 'funcionario',
    modelo_id: modelo?.id || '',
    modelo_nome: modelo?.nome || '',
    competencia,
    dia_vencimento: FOLHA_DIA_VENCIMENTO,
    status: 'rascunho',
    situacao_mes: situacaoMes,
    grupo_lancamento_id: gerarGrupoLancamentoId(),
    rubricas,
    movimentos: [],
  });
}

/** Abre competências para colaboradores com modelo vinculado (respeita desligamento) */
export async function abrirCompetenciasDoMes(competencia) {
  const [modelos, colaboradores] = await Promise.all([listarModelos(), listarColaboradoresAtivos()]);
  const modelosVinculados = (modelos || []).filter((m) => m.colaborador_id && m.ativo !== false);

  const criados = [];
  const pulados = [];

  for (const modelo of modelosVinculados) {
    if (!modeloEstaAtivoNaCompetencia(modelo, competencia)) {
      pulados.push(modelo.colaborador_nome);
      continue;
    }
    const col = colaboradores.find((c) => c.id === modelo.colaborador_id) || {
      id: modelo.colaborador_id,
      nome: modelo.colaborador_nome,
    };
    const comp = await garantirCompetencia({ colaborador: col, modelo, competencia });
    if (comp) criados.push(comp);
  }

  return { criados, pulados };
}

export async function adicionarMovimento(competenciaId, movimento) {
  const comp = await base44.entities.FolhaPrevisaoCompetencia.get(competenciaId);
  if (competenciaEstaFechada(comp)) {
    throw new Error('A folha deste mês já fechou (último dia do mês). Movimentos não podem ser alterados.');
  }
  const movimentos = [...(comp.movimentos || []), { ...movimento, id: movimento.id || gerarIdInterno('mov') }];
  return base44.entities.FolhaPrevisaoCompetencia.update(competenciaId, { movimentos });
}

export async function removerMovimento(competenciaId, movimentoId) {
  const comp = await base44.entities.FolhaPrevisaoCompetencia.get(competenciaId);
  if (competenciaEstaFechada(comp)) {
    throw new Error('A folha deste mês já fechou (último dia do mês). Movimentos não podem ser alterados.');
  }
  const movimentos = (comp.movimentos || []).filter((m) => m.id !== movimentoId);
  return base44.entities.FolhaPrevisaoCompetencia.update(competenciaId, { movimentos });
}

/** Fecha competências cujo mês já passou do último dia (regra automática). */
export async function sincronizarFechamentoCompetencias(competencia) {
  const comps = competencia
    ? await base44.entities.FolhaPrevisaoCompetencia.filter({ competencia })
    : await base44.entities.FolhaPrevisaoCompetencia.list('-created_date', 500);

  let fechadas = 0;
  for (const c of comps || []) {
    if (c.status === 'fechado') continue;
    if (!competenciaDeveEstarFechada(c.competencia)) continue;
    await base44.entities.FolhaPrevisaoCompetencia.update(c.id, { status: 'fechado' });
    fechadas += 1;
  }
  return fechadas;
}

/**
 * Sincroniza previsão com LancamentoFinanceiro (opcional).
 * Inclui 13º, férias e rescisão no valor enviado.
 */
export async function sincronizarLancamentoFinanceiro(competencia, opcoes = {}) {
  const { contaFinanceiraId, categoriaId, categoriaNome, modelo } = opcoes;
  if (!contaFinanceiraId) return null;

  const totais = calcularTotaisCompetencia(competencia, modelo);
  const valor = totais.liquido;
  if (valor <= 0) return null;

  const grupoId = competencia.grupo_lancamento_id || gerarGrupoLancamentoId();
  const descricao = `Folha ${competencia.colaborador_nome} — ${competencia.competencia}`;
  const dataVencimento = dataVencimentoPagamentoFolha(competencia.competencia);
  if (!dataVencimento) return null;

  const extras = [];
  if (totais.totalDecimo > 0) extras.push(`13º ${totais.totalDecimo.toFixed(2)}`);
  if (totais.totalFerias > 0) extras.push(`férias ${totais.totalFerias.toFixed(2)}`);
  if (totais.totalRetiradaSocio > 0) extras.push(`retirada sócio ${totais.totalRetiradaSocio.toFixed(2)}`);

  const existentes = await base44.entities.LancamentoFinanceiro.filter({
    grupo_lancamento_id: grupoId,
  });

  const lfExistente = (existentes || []).find(
    (l) => Array.isArray(l.tags) && l.tags.includes('folha_previsao'),
  );

  const payload = {
    tipo: 'Despesa',
    descricao,
    valor,
    valor_liquido: valor,
    data_vencimento: dataVencimento,
    status: 'Em Aberto',
    conta_financeira_id: contaFinanceiraId,
    categoria_id: categoriaId || '',
    categoria: categoriaNome || (modelo?.tipo_vinculo === 'socio' ? 'Retirada sócio' : 'Salários'),
    tags: [
      'conta_pagar',
      'folha_previsao',
      modelo?.tipo_vinculo === 'socio' ? 'folha_socio' : 'folha_funcionario',
    ],
    grupo_lancamento_id: grupoId,
    referencia_tipo: 'Manual',
    referencia_id: competencia.id,
    observacoes: `Previsão folha — líquido ${totais.liquido.toFixed(2)} | encargos ${totais.encargosEmpresa.toFixed(2)}${extras.length ? ` | ${extras.join(', ')}` : ''}`,
  };

  if (lfExistente) {
    return base44.entities.LancamentoFinanceiro.update(lfExistente.id, payload);
  }

  const criado = await base44.entities.LancamentoFinanceiro.create(payload);
  if (!competencia.grupo_lancamento_id) {
    await base44.entities.FolhaPrevisaoCompetencia.update(competencia.id, {
      grupo_lancamento_id: grupoId,
    });
  }
  return criado;
}
