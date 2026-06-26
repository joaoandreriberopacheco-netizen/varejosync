import { base44 } from '@/api/base44Client';
import {
  calcularTotaisCompetencia,
  clonarRubricas,
  criarRubricasPadrao,
  gerarGrupoLancamentoId,
  gerarIdInterno,
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

/** Duplica um modelo existente (padrão "irmão") */
export async function duplicarModelo(modelo, overrides = {}) {
  const rubricas = clonarRubricas(modelo?.rubricas?.length ? modelo.rubricas : criarRubricasPadrao());
  return base44.entities.FolhaPrevisaoModelo.create({
    nome: overrides.nome || `${modelo?.nome || 'Modelo'} (cópia)`,
    descricao: modelo?.descricao || '',
    colaborador_id: overrides.colaborador_id ?? modelo?.colaborador_id ?? '',
    colaborador_nome: overrides.colaborador_nome ?? modelo?.colaborador_nome ?? '',
    dia_vencimento: overrides.dia_vencimento ?? modelo?.dia_vencimento ?? 5,
    ativo: true,
    rubricas,
    ...overrides,
  });
}

export async function criarModeloPadrao(nome = 'Modelo padrão') {
  return base44.entities.FolhaPrevisaoModelo.create({
    nome,
    dia_vencimento: 5,
    ativo: true,
    rubricas: criarRubricasPadrao(),
  });
}

/** Garante competência do mês para um colaborador a partir de um modelo */
export async function garantirCompetencia({ colaborador, modelo, competencia }) {
  const existentes = await base44.entities.FolhaPrevisaoCompetencia.filter({
    colaborador_id: colaborador.id,
    competencia,
  });
  if (existentes?.length) return existentes[0];

  const rubricas = clonarRubricas(modelo?.rubricas?.length ? modelo.rubricas : criarRubricasPadrao());

  return base44.entities.FolhaPrevisaoCompetencia.create({
    colaborador_id: colaborador.id,
    colaborador_nome: colaborador.nome,
    modelo_id: modelo?.id || '',
    modelo_nome: modelo?.nome || '',
    competencia,
    dia_vencimento: modelo?.dia_vencimento ?? 5,
    status: 'rascunho',
    grupo_lancamento_id: gerarGrupoLancamentoId(),
    rubricas,
    movimentos: [],
  });
}

/** Abre competências para todos os colaboradores ativos com modelo vinculado */
export async function abrirCompetenciasDoMes(competencia) {
  const [modelos, colaboradores] = await Promise.all([listarModelos(), listarColaboradoresAtivos()]);
  const modelosAtivos = (modelos || []).filter((m) => m.ativo !== false);

  const criados = [];
  for (const col of colaboradores) {
    const modelo =
      modelosAtivos.find((m) => m.colaborador_id === col.id) ||
      modelosAtivos.find((m) => !m.colaborador_id) ||
      modelosAtivos[0];
    if (!modelo) continue;
    const comp = await garantirCompetencia({ colaborador: col, modelo, competencia });
    criados.push(comp);
  }
  return criados;
}

export async function adicionarMovimento(competenciaId, movimento) {
  const comp = await base44.entities.FolhaPrevisaoCompetencia.get(competenciaId);
  const movimentos = [...(comp.movimentos || []), { ...movimento, id: movimento.id || gerarIdInterno('mov') }];
  return base44.entities.FolhaPrevisaoCompetencia.update(competenciaId, { movimentos });
}

export async function removerMovimento(competenciaId, movimentoId) {
  const comp = await base44.entities.FolhaPrevisaoCompetencia.get(competenciaId);
  const movimentos = (comp.movimentos || []).filter((m) => m.id !== movimentoId);
  return base44.entities.FolhaPrevisaoCompetencia.update(competenciaId, { movimentos });
}

/**
 * Sincroniza previsão com LancamentoFinanceiro (opcional).
 * Cria/atualiza um lançamento principal "Em Aberto" com tag folha_previsao.
 */
export async function sincronizarLancamentoFinanceiro(competencia, opcoes = {}) {
  const { contaFinanceiraId, categoriaId, categoriaNome } = opcoes;
  if (!contaFinanceiraId) return null;

  const totais = calcularTotaisCompetencia(competencia);
  const valor = totais.liquido;
  if (valor <= 0) return null;

  const grupoId = competencia.grupo_lancamento_id || gerarGrupoLancamentoId();
  const descricao = `Folha ${competencia.colaborador_nome} — ${competencia.competencia}`;
  const [y, m] = competencia.competencia.split('-');
  const dia = Math.min(competencia.dia_vencimento || 5, 28);
  const dataVencimento = `${y}-${m}-${String(dia).padStart(2, '0')}`;

  const existentes = await base44.entities.LancamentoFinanceiro.filter({
    grupo_lancamento_id: grupoId,
    tags: { $contains: 'folha_previsao' },
  });

  const payload = {
    tipo: 'Despesa',
    descricao,
    valor,
    valor_liquido: valor,
    data_vencimento: dataVencimento,
    status: 'Em Aberto',
    conta_financeira_id: contaFinanceiraId,
    categoria_id: categoriaId || '',
    categoria: categoriaNome || 'Salários',
    tags: ['conta_pagar', 'folha_previsao'],
    grupo_lancamento_id: grupoId,
    referencia_tipo: 'Manual',
    referencia_id: competencia.id,
    observacoes: `Previsão folha — líquido ${totais.liquido.toFixed(2)} | encargos empresa ${totais.encargosEmpresa.toFixed(2)}`,
  };

  if (existentes?.length) {
    return base44.entities.LancamentoFinanceiro.update(existentes[0].id, payload);
  }

  const criado = await base44.entities.LancamentoFinanceiro.create(payload);
  if (!competencia.grupo_lancamento_id) {
    await base44.entities.FolhaPrevisaoCompetencia.update(competencia.id, {
      grupo_lancamento_id: grupoId,
    });
  }
  return criado;
}
