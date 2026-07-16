import { base44 } from '@/api/base44Client';
import {
  TAG_LF_GERADO_AUTO,
  gerarLancamentosMensaisAteFimDoAno,
  lancamentoRecorrenteContaPagarParaListaBoleto,
  mesReferenciaLancamento,
} from '@/lib/agefinLancamentosRecorrencia';
import { lancamentoPago, lancamentoCancelado } from '@/lib/agefinConsultaFilters';
import {
  competenciaDeveEstarFechada,
  competenciaEstaFechada,
  criarSerieComDefaults,
  dataVencimentoNaCompetencia,
  gerarGrupoLancamentoId,
  serieEstaAtivaNaCompetencia,
} from '@/lib/agefinPrevisaoCalculos';
import { listarCentrosCustoRegistros } from '@/lib/folhaPrevisaoService';

export { listarCentrosCustoRegistros };

const DADOS_EMPRESA_SERIES_KEY = 'agefin_series_modelo';

async function obterRegistroDadosEmpresa() {
  const dados = await base44.entities.DadosEmpresa.list();
  return dados?.[0] || null;
}

async function persistirSeriesModelo(series) {
  const empresa = await obterRegistroDadosEmpresa();
  const payload = { [DADOS_EMPRESA_SERIES_KEY]: series || [] };
  if (empresa?.id) {
    await base44.entities.DadosEmpresa.update(empresa.id, payload);
  } else {
    await base44.entities.DadosEmpresa.create({
      razao_social: 'Empresa',
      nome_fantasia: 'Configuração ERP',
      ...payload,
    });
  }
  return series;
}

export async function listarModelos() {
  const empresa = await obterRegistroDadosEmpresa();
  const series = Array.isArray(empresa?.[DADOS_EMPRESA_SERIES_KEY])
    ? empresa[DADOS_EMPRESA_SERIES_KEY]
    : [];
  if (series.length) return series;
  return sincronizarModelosDesdeLancamentos();
}

export async function salvarSerie(payload) {
  const series = await listarModelos();
  const body = criarSerieComDefaults({
    ...payload,
    id: payload.id || undefined,
    grupo_lancamento_id: payload.grupo_lancamento_id || gerarGrupoLancamentoId(),
  });
  const idx = series.findIndex((s) => s.id === body.id);
  const next = [...series];
  if (idx >= 0) next[idx] = { ...next[idx], ...body };
  else next.push(body);
  await persistirSeriesModelo(next);
  return body;
}

export async function removerSerie(serieId) {
  const series = await listarModelos();
  const next = series.filter((s) => s.id !== serieId);
  await persistirSeriesModelo(next);
}

export async function atualizarCentroCustoSerie(serieId, centroCusto) {
  const series = await listarModelos();
  const next = series.map((s) =>
    s.id === serieId ? { ...s, centro_custo: centroCusto || '' } : s,
  );
  await persistirSeriesModelo(next);
  return next.find((s) => s.id === serieId) || null;
}

/** Importa séries a partir de grupos recorrentes já existentes no financeiro. */
export async function sincronizarModelosDesdeLancamentos() {
  try {
    await gerarLancamentosMensaisAteFimDoAno(base44);
  } catch (e) {
    console.error('Sincronizar recorrências mensais:', e);
  }

  const lancamentos = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 5000);
  const recorrentes = (lancamentos || []).filter(lancamentoRecorrenteContaPagarParaListaBoleto);
  const byGrupo = new Map();
  for (const lf of recorrentes) {
    const gid = lf.grupo_lancamento_id;
    if (!byGrupo.has(gid)) byGrupo.set(gid, []);
    byGrupo.get(gid).push(lf);
  }

  const series = [];
  for (const [gid, rows] of byGrupo) {
    const sorted = [...rows].sort((a, b) =>
      (b.data_vencimento || '').localeCompare(a.data_vencimento || ''),
    );
    const rep = sorted[0];
    series.push(
      criarSerieComDefaults({
        id: `serie-import-${gid}`,
        nome: rep.descricao || rep.terceiro_nome || 'Conta recorrente',
        terceiro_nome: rep.terceiro_nome || '',
        terceiro_id: rep.terceiro_id || '',
        categoria_id: rep.categoria_id || '',
        categoria_nome: rep.categoria || '',
        valor_previsto: Number(rep.valor) || 0,
        dia_vencimento: Number((rep.data_vencimento || '').slice(8, 10)) || 10,
        frequencia: rep.frequencia_recorrencia || 'Mensal',
        grupo_lancamento_id: gid,
        ativo: true,
      }),
    );
  }

  if (series.length) await persistirSeriesModelo(series);
  return series;
}

export async function listarLancamentosCompetencia(competencia) {
  const lancamentos = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 5000);
  return (lancamentos || []).filter((lf) => {
    if (!lancamentoRecorrenteContaPagarParaListaBoleto(lf)) return false;
    return mesReferenciaLancamento(lf) === competencia;
  });
}

function payloadLancamentoAuto(modelo, competencia) {
  const dataVencimento = dataVencimentoNaCompetencia(competencia, modelo.dia_vencimento);
  const valor = Number(modelo.valor_previsto) || 0;
  return {
    tipo: 'Despesa',
    descricao: modelo.nome,
    terceiro_id: modelo.terceiro_id || undefined,
    terceiro_nome: modelo.terceiro_nome || undefined,
    valor,
    valor_liquido: valor,
    data_vencimento: dataVencimento,
    status: 'Em Aberto',
    status_conciliacao: 'N/A',
    categoria: modelo.categoria_nome || undefined,
    categoria_id: modelo.categoria_id || undefined,
    referencia_tipo: 'AgefinSerie',
    referencia_id: modelo.id,
    observacoes: `Competência ${competencia} — aberta pela AGEFIN.`,
    tags: ['conta_pagar', 'recorrente', TAG_LF_GERADO_AUTO, 'agefin_previsao'],
    is_recorrente: true,
    frequencia_recorrencia: modelo.frequencia || 'Mensal',
    grupo_lancamento_id: modelo.grupo_lancamento_id,
  };
}

async function buscarLancamentoMes(modelo, competencia) {
  if (!modelo?.grupo_lancamento_id) return null;
  const rows = await base44.entities.LancamentoFinanceiro.filter({
    grupo_lancamento_id: modelo.grupo_lancamento_id,
  });
  return (rows || []).find((lf) => mesReferenciaLancamento(lf) === competencia) || null;
}

export async function abrirCompetenciasDoMes(competencia) {
  const modelos = await listarModelos();
  const criados = [];
  const pulados = [];

  for (const modelo of modelos) {
    if (!serieEstaAtivaNaCompetencia(modelo, competencia)) {
      pulados.push(modelo.nome);
      continue;
    }
    const existente = await buscarLancamentoMes(modelo, competencia);
    if (existente) {
      pulados.push(modelo.nome);
      continue;
    }
    const lf = await base44.entities.LancamentoFinanceiro.create(
      payloadLancamentoAuto(modelo, competencia),
    );
    criados.push(lf);
  }

  return { criados, pulados };
}

export async function desfazerAberturaCompetenciasDoMes(competencia) {
  const modelos = await listarModelos();
  const removidas = [];
  const bloqueadas = [];

  for (const modelo of modelos) {
    const lf = await buscarLancamentoMes(modelo, competencia);
    if (!lf) continue;

    if (lancamentoPago(lf)) {
      bloqueadas.push({ nome: modelo.nome, motivo: 'pago' });
      continue;
    }
    if (lancamentoCancelado(lf)) {
      bloqueadas.push({ nome: modelo.nome, motivo: 'cancelado' });
      continue;
    }
    const tags = Array.isArray(lf.tags) ? lf.tags : [];
    if (!tags.includes(TAG_LF_GERADO_AUTO) && !tags.includes('agefin_previsao')) {
      bloqueadas.push({ nome: modelo.nome, motivo: 'com_boleto' });
      continue;
    }

    await base44.entities.LancamentoFinanceiro.delete(lf.id);
    removidas.push(lf);
  }

  return {
    total: removidas.length + bloqueadas.length,
    removidas,
    bloqueadas,
  };
}

export async function sincronizarFechamentoCompetencias(competencia) {
  const lancamentos = competencia
    ? await listarLancamentosCompetencia(competencia)
    : (await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 5000)).filter(
        lancamentoRecorrenteContaPagarParaListaBoleto,
      );

  let fechadas = 0;
  for (const lf of lancamentos || []) {
    const mes = mesReferenciaLancamento(lf);
    if (!mes || !competenciaDeveEstarFechada(mes)) continue;
    if (lancamentoPago(lf) || lancamentoCancelado(lf)) continue;
    fechadas += 1;
  }
  return fechadas;
}

export async function sincronizarLancamentoFinanceiro(competencia, opcoes = {}) {
  const { contaFinanceiraId, modelo } = opcoes;
  if (!contaFinanceiraId || !modelo) return null;

  const valor = Number(competencia.valor_real ?? competencia.valor_previsto ?? modelo.valor_previsto) || 0;
  if (valor <= 0) return null;

  const payload = {
    ...payloadLancamentoAuto(modelo, competencia.competencia),
    valor,
    valor_liquido: valor,
    conta_financeira_id: contaFinanceiraId,
    status: 'Pendente',
  };

  if (competencia.lancamento_id) {
    return base44.entities.LancamentoFinanceiro.update(competencia.lancamento_id, payload);
  }

  return base44.entities.LancamentoFinanceiro.create(payload);
}

export async function listarContasFinanceiras() {
  const contas = await base44.entities.ContasFinanceiras.list();
  return (contas || []).filter((c) => c.ativo !== false);
}

export async function registrarEncerramentoSerie(serieId, dataEncerramento) {
  const series = await listarModelos();
  const next = series.map((s) =>
    s.id === serieId
      ? {
          ...s,
          situacao: 'encerrada',
          data_encerramento: dataEncerramento,
          ativo: false,
        }
      : s,
  );
  await persistirSeriesModelo(next);
  return next.find((s) => s.id === serieId);
}

export async function reativarSerie(serieId) {
  const series = await listarModelos();
  const next = series.map((s) =>
    s.id === serieId
      ? { ...s, situacao: 'ativa', data_encerramento: null, ativo: true }
      : s,
  );
  await persistirSeriesModelo(next);
  return next.find((s) => s.id === serieId);
}

export function podeEditarCompetencia(comp) {
  return comp && !competenciaEstaFechada(comp) && !comp._modoPlanejamento;
}
