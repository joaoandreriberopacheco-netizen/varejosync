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
  serieDeveAparecerNaCompetencia,
  serieEstaAtivaNaCompetencia,
} from '@/lib/agefinPrevisaoCalculos';
import { listarCentrosCustoRegistros } from '@/lib/folhaPrevisaoService';

export { listarCentrosCustoRegistros };

const DADOS_EMPRESA_SERIES_KEY = 'agefin_series_modelo';

async function obterRegistroDadosEmpresa() {
  const dados = await base44.entities.DadosEmpresa.list();
  return dados?.[0] || null;
}

function stripEmpresaMeta(empresa) {
  if (!empresa) return {};
  const {
    id: _id,
    created_date: _cd,
    updated_date: _ud,
    created_at: _ca,
    updated_at: _ua,
    created_by: _cb,
    ...resto
  } = empresa;
  return resto;
}

function empresaTemArmazenamentoSeries(empresa) {
  return empresa != null && DADOS_EMPRESA_SERIES_KEY in empresa;
}

function lerSeriesEmpresa(empresa) {
  const raw = empresa?.[DADOS_EMPRESA_SERIES_KEY];
  return Array.isArray(raw) ? raw : [];
}

async function tryListEntitySeries() {
  try {
    const api = base44.entities?.AgefinSerieModelo;
    if (!api?.list) return null;
    const rows = await api.list('-created_date');
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

async function upsertSerieEntidade(serie) {
  try {
    const api = base44.entities?.AgefinSerieModelo;
    if (!api) return false;
    const body = criarSerieComDefaults(serie);
    let existente = [];
    try {
      existente = (await api.filter?.({ id: body.id })) || [];
    } catch {
      try {
        const row = await api.get?.(body.id);
        if (row?.id) existente = [row];
      } catch {
        /* nova série */
      }
    }
    if (existente?.length) {
      await api.update(body.id, body);
    } else {
      await api.create(body);
    }
    return true;
  } catch {
    return false;
  }
}

async function removerSerieEntidade(serieId) {
  try {
    const api = base44.entities?.AgefinSerieModelo;
    if (!api?.delete) return false;
    await api.delete(serieId);
    return true;
  } catch {
    return false;
  }
}

async function sincronizarSeriesParaEntidade(series) {
  for (const serie of series || []) {
    await upsertSerieEntidade(serie);
  }
}

async function persistirSeriesModelo(series, empresaExistente = null) {
  const empresa = empresaExistente ?? (await obterRegistroDadosEmpresa());
  const payload = {
    ...stripEmpresaMeta(empresa),
    [DADOS_EMPRESA_SERIES_KEY]: series || [],
  };

  if (empresa?.id) {
    await base44.entities.DadosEmpresa.update(empresa.id, payload);
  } else {
    await base44.entities.DadosEmpresa.create({
      razao_social: 'Empresa',
      nome_fantasia: 'Configuração ERP',
      ...payload,
    });
  }

  void sincronizarSeriesParaEntidade(series);
  return series;
}

async function obterSeriesParaEdicao() {
  const entityRows = await tryListEntitySeries();
  if (entityRows?.length) return entityRows;

  const empresa = await obterRegistroDadosEmpresa();
  if (empresaTemArmazenamentoSeries(empresa)) {
    return lerSeriesEmpresa(empresa);
  }

  return entityRows ?? [];
}

export async function listarModelos() {
  const entityRows = await tryListEntitySeries();
  if (entityRows?.length) return entityRows;

  const empresa = await obterRegistroDadosEmpresa();
  if (empresaTemArmazenamentoSeries(empresa)) {
    const series = lerSeriesEmpresa(empresa);
    if (series.length) void sincronizarSeriesParaEntidade(series);
    return series;
  }

  return sincronizarModelosDesdeLancamentos();
}

export async function salvarSerie(payload) {
  const empresa = await obterRegistroDadosEmpresa();
  const series = await obterSeriesParaEdicao();
  const body = criarSerieComDefaults({
    ...payload,
    id: payload.id || undefined,
    grupo_lancamento_id: payload.grupo_lancamento_id || gerarGrupoLancamentoId(),
  });
  const idx = series.findIndex((s) => s.id === body.id);
  const next = [...series];
  if (idx >= 0) next[idx] = { ...next[idx], ...body };
  else next.push(body);

  await upsertSerieEntidade(body);
  await persistirSeriesModelo(next, empresa);
  return body;
}

export async function removerSerie(serieId) {
  const empresa = await obterRegistroDadosEmpresa();
  const series = await obterSeriesParaEdicao();
  const next = series.filter((s) => s.id !== serieId);
  await removerSerieEntidade(serieId);
  await persistirSeriesModelo(next, empresa);
}

export async function atualizarCentroCustoSerie(serieId, centroCusto) {
  const empresa = await obterRegistroDadosEmpresa();
  const series = await obterSeriesParaEdicao();
  const next = series.map((s) =>
    s.id === serieId ? { ...s, centro_custo: centroCusto || '' } : s,
  );
  const atualizada = next.find((s) => s.id === serieId);
  if (atualizada) await upsertSerieEntidade(atualizada);
  await persistirSeriesModelo(next, empresa);
  return atualizada || null;
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
        mes_vencimento: Number((rep.data_vencimento || '').slice(5, 7)) || new Date().getMonth() + 1,
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

/** Lançamentos recorrentes (conta a pagar) para alimentar a projeção de 12 meses. */
export async function listarLancamentosRecorrentes() {
  const lancamentos = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 5000);
  return (lancamentos || []).filter(lancamentoRecorrenteContaPagarParaListaBoleto);
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
    observacoes: `Competência ${competencia} — aberta pelo planejamento financeiro.`,
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
    if (!serieDeveAparecerNaCompetencia(modelo, competencia)) {
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

/**
 * Atualiza valor e vencimento manualmente (sem ler o boleto).
 * — Com lançamento: grava no LancamentoFinanceiro.
 * — Em planejamento: grava no modelo (cadastro da série).
 */
export async function atualizarCompetenciaManual({ competencia, modelo, valor, dataVencimento, diaVencimento }) {
  const valorNum = Number(valor) || 0;
  if (valorNum <= 0) throw new Error('Informe um valor maior que zero.');

  if (competencia?.lancamento_id) {
    const lf = await base44.entities.LancamentoFinanceiro.get(competencia.lancamento_id);
    const tags = new Set([...(lf?.tags || []), 'conta_pagar']);
    tags.delete(TAG_LF_GERADO_AUTO);
    const ven = (dataVencimento || '').slice(0, 10) || lf?.data_vencimento;
    return base44.entities.LancamentoFinanceiro.update(competencia.lancamento_id, {
      valor: valorNum,
      valor_liquido: valorNum,
      data_vencimento: ven,
      tags: [...tags],
    });
  }

  if (!modelo?.id) throw new Error('Abra o mês antes de editar o valor desta conta.');

  const dia = Number(diaVencimento) || Number(modelo.dia_vencimento) || 10;
  return salvarSerie({
    ...modelo,
    valor_previsto: valorNum,
    dia_vencimento: dia,
  });
}
