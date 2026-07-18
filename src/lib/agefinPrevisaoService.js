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
  competenciaBloqueadaEdicao,
  criarSerieComDefaults,
  dataVencimentoNaCompetencia,
  gerarGrupoLancamentoId,
  normalizarFrequenciaSerie,
  FREQUENCIA_SERIE,
  serieDeveAparecerNaCompetencia,
  serieEstaAtivaNaCompetencia,
} from '@/lib/agefinPrevisaoCalculos';
import { listarCentrosCustoRegistros } from '@/lib/folhaPrevisaoService';
import {
  atualizarDadosEmpresa,
  obterRegistroDadosEmpresa as obterDadosEmpresa,
} from '@/lib/dadosEmpresaMerge';

export { listarCentrosCustoRegistros };

const DADOS_EMPRESA_SERIES_KEY = 'agefin_series_modelo';
const DADOS_EMPRESA_SERIES_BACKUP_KEY = 'agefin_series_modelo_backup';
const DADOS_EMPRESA_SERIES_BACKUP_AT_KEY = 'agefin_series_modelo_backup_at';

async function obterRegistroDadosEmpresa() {
  return obterDadosEmpresa(base44);
}

function empresaTemArmazenamentoSeries(empresa) {
  return empresa != null && DADOS_EMPRESA_SERIES_KEY in empresa;
}

function lerSeriesEmpresa(empresa) {
  if (!empresa) return [];
  const raw =
    empresa[DADOS_EMPRESA_SERIES_KEY] ??
    (empresa.dados && typeof empresa.dados === 'object'
      ? empresa.dados[DADOS_EMPRESA_SERIES_KEY]
      : undefined);
  return Array.isArray(raw) ? raw : [];
}

function lerSeriesBackupEmpresa(empresa) {
  if (!empresa) return [];
  const raw =
    empresa[DADOS_EMPRESA_SERIES_BACKUP_KEY] ??
    (empresa.dados && typeof empresa.dados === 'object'
      ? empresa.dados[DADOS_EMPRESA_SERIES_BACKUP_KEY]
      : undefined);
  return Array.isArray(raw) ? raw : [];
}

/** Une listas por id; listas posteriores sobrescrevem campos das anteriores. */
function mesclarSeriesPorId(...listas) {
  const map = new Map();
  for (const lista of listas) {
    for (const serie of lista || []) {
      if (!serie?.id) continue;
      map.set(serie.id, { ...map.get(serie.id), ...serie });
    }
  }
  return [...map.values()];
}

async function lerTodasSeriesArmazenadas() {
  const empresa = await obterRegistroDadosEmpresa();
  const empresaRows = lerSeriesEmpresa(empresa);
  const entityRows = (await tryListEntitySeries()) ?? [];
  const localRows = lerSeriesLocalStorage();
  return {
    empresa,
    empresaRows,
    entityRows,
    localRows,
    merged: mesclarSeriesPorId(localRows, entityRows, empresaRows),
  };
}

const LS_SERIES_KEY = 'p38_agefin_series_modelo_v1';

function lerSeriesLocalStorage() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_SERIES_KEY);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvarSeriesLocalStorage(series) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_SERIES_KEY, JSON.stringify(series || []));
  } catch {
    /* quota / modo privado */
  }
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

async function buscarSerieEntidade(serieId) {
  try {
    const api = base44.entities?.AgefinSerieModelo;
    if (!api || !serieId) return null;
    if (api.filter) {
      const rows = await api.filter({ id: serieId });
      if (rows?.[0]?.id) return criarSerieComDefaults(rows[0]);
    }
    if (api.get) {
      const row = await api.get(serieId);
      if (row?.id) return criarSerieComDefaults(row);
    }
  } catch {
    /* entidade opcional */
  }
  return null;
}

async function upsertSerieEntidade(serie) {
  const api = base44.entities?.AgefinSerieModelo;
  if (!api?.create) return null;
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
    return criarSerieComDefaults(await api.update(body.id, body));
  }
  return criarSerieComDefaults(await api.create(body));
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

async function gravarBackupSeries(empresa, series) {
  if (!Array.isArray(series) || series.length === 0) return;
  try {
    await atualizarDadosEmpresa(base44, {
      [DADOS_EMPRESA_SERIES_BACKUP_KEY]: series.map((s) => criarSerieComDefaults(s)),
      [DADOS_EMPRESA_SERIES_BACKUP_AT_KEY]: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[agefin] Falha ao gravar backup de séries:', error);
  }
}

async function persistirSeriesModelo(series, { modo = 'merge' } = {}) {
  const snapshot = await lerTodasSeriesArmazenadas();
  const atual = snapshot.merged;

  if (atual.length > 0) {
    await gravarBackupSeries(snapshot.empresa, atual);
  }

  const incoming = (series || []).map((s) => criarSerieComDefaults(s));
  const seriesNorm =
    modo === 'substituir' ? incoming : mesclarSeriesPorId(atual, incoming);

  salvarSeriesLocalStorage(seriesNorm);

  let empresaAtualizada = null;
  try {
    empresaAtualizada = await atualizarDadosEmpresa(base44, {
      [DADOS_EMPRESA_SERIES_KEY]: seriesNorm,
    });
  } catch (error) {
    console.error('[agefin] Falha ao gravar em DadosEmpresa:', error);
  }

  try {
    await sincronizarSeriesParaEntidade(seriesNorm);
  } catch (error) {
    console.error('[agefin] Falha ao espelhar em AgefinSerieModelo:', error);
  }

  return {
    seriesNorm,
    empresaRows: lerSeriesEmpresa(empresaAtualizada),
  };
}

async function verificarSeriePersistida(serieId, tentativas = 5) {
  for (let i = 0; i < tentativas; i += 1) {
    const fromEntity = await buscarSerieEntidade(serieId);
    if (fromEntity) return fromEntity;

    const { merged } = await lerTodasSeriesArmazenadas();
    const found = merged.find((s) => s.id === serieId);
    if (found) return criarSerieComDefaults(found);

    if (i < tentativas - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return null;
}

async function obterSeriesParaEdicao() {
  const { merged } = await lerTodasSeriesArmazenadas();
  return merged;
}

export async function listarModelos() {
  const { empresa, merged } = await lerTodasSeriesArmazenadas();

  if (merged.length) {
    return merged;
  }

  if (empresaTemArmazenamentoSeries(empresa)) {
    return [];
  }

  return sincronizarModelosDesdeLancamentos();
}

export async function salvarSerie(payload) {
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

  let entityRow = null;
  try {
    entityRow = await upsertSerieEntidade(body);
  } catch (error) {
    console.error('[agefin] AgefinSerieModelo indisponível:', error);
  }

  const { seriesNorm, empresaRows } = await persistirSeriesModelo(next);
  const naRespostaEmpresa = empresaRows.find((s) => s.id === body.id);
  if (naRespostaEmpresa) return criarSerieComDefaults(naRespostaEmpresa);
  if (entityRow?.id) return entityRow;

  const verificada = await verificarSeriePersistida(body.id);
  if (verificada) return verificada;

  const noLocal = seriesNorm.find((s) => s.id === body.id);
  if (noLocal) {
    console.warn('[agefin] Conta salva localmente; nuvem não confirmou ainda.');
    return criarSerieComDefaults(noLocal);
  }

  throw new Error(
    'Não foi possível gravar a conta. Verifique a conexão e tente novamente.',
  );
}

export async function removerSerie(serieId) {
  const series = await obterSeriesParaEdicao();
  const next = series.filter((s) => s.id !== serieId);
  await removerSerieEntidade(serieId);
  await persistirSeriesModelo(next, { modo: 'substituir' });
}

export async function atualizarCentroCustoSerie(serieId, centroCusto) {
  const series = await obterSeriesParaEdicao();
  const next = series.map((s) =>
    s.id === serieId ? { ...s, centro_custo: centroCusto || '' } : s,
  );
  const atualizada = next.find((s) => s.id === serieId);
  await persistirSeriesModelo(next);
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

  if (series.length) await persistirSeriesModelo(series, { modo: 'merge' });
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
    referencia_tipo: 'Manual',
    referencia_id: modelo.id,
    observacoes: `Competência ${competencia} — aberta pelo planejamento financeiro. Conta financeira será definida na execução.`,
    tags: ['conta_pagar', 'recorrente', TAG_LF_GERADO_AUTO, 'agefin_previsao', 'conta_a_definir'],
    is_recorrente: true,
    frequencia_recorrencia: normalizarFrequenciaSerie(modelo.frequencia),
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

/** Abre só uma conta fixa no mês (sem abrir as demais). */
export async function abrirCompetenciaSerie(modelo, competencia) {
  if (!modelo?.id) throw new Error('Conta não encontrada.');
  if (!serieDeveAparecerNaCompetencia(modelo, competencia)) {
    throw new Error('Esta conta não entra neste mês.');
  }
  const existente = await buscarLancamentoMes(modelo, competencia);
  if (existente) return existente;
  return base44.entities.LancamentoFinanceiro.create(payloadLancamentoAuto(modelo, competencia));
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
  return comp && !competenciaBloqueadaEdicao(comp);
}

function contarSeriesNaoMensais(series = []) {
  return (series || []).filter(
    (s) => normalizarFrequenciaSerie(s?.frequencia) !== FREQUENCIA_SERIE.MENSAL,
  ).length;
}

function reconstruirSeriesDesdeLancamentos(lancamentos = [], seriesExistentes = []) {
  const gruposExistentes = new Set(
    (seriesExistentes || []).map((s) => s.grupo_lancamento_id).filter(Boolean),
  );
  const idsExistentes = new Set((seriesExistentes || []).map((s) => s.id));
  const byGrupo = new Map();

  for (const lf of lancamentos || []) {
    const gid = lf?.grupo_lancamento_id;
    if (!gid || gruposExistentes.has(gid)) continue;
    const freq = normalizarFrequenciaSerie(lf.frequencia_recorrencia);
    if (freq === FREQUENCIA_SERIE.MENSAL) continue;
    if (!byGrupo.has(gid)) byGrupo.set(gid, []);
    byGrupo.get(gid).push(lf);
  }

  const reconstruidas = [];
  for (const [gid, rows] of byGrupo) {
    const sorted = [...rows].sort((a, b) =>
      (b.data_vencimento || '').localeCompare(a.data_vencimento || ''),
    );
    const rep = sorted[0];
    const freq = normalizarFrequenciaSerie(rep.frequencia_recorrencia);
    const id = `serie-recuperada-${gid}`;
    if (idsExistentes.has(id)) continue;

    reconstruidas.push(
      criarSerieComDefaults({
        id,
        nome: rep.descricao || rep.terceiro_nome || 'Conta recuperada',
        terceiro_nome: rep.terceiro_nome || '',
        terceiro_id: rep.terceiro_id || '',
        categoria_id: rep.categoria_id || '',
        categoria_nome: rep.categoria || '',
        valor_previsto: Number(rep.valor_liquido ?? rep.valor) || 0,
        dia_vencimento: Number((rep.data_vencimento || '').slice(8, 10)) || 10,
        mes_vencimento: Number((rep.data_vencimento || '').slice(5, 7)) || new Date().getMonth() + 1,
        frequencia: freq,
        grupo_lancamento_id: gid,
        ativo: true,
        observacoes: 'Recuperada automaticamente a partir do financeiro.',
      }),
    );
  }

  return reconstruidas;
}

/** Diagnóstico das fontes de armazenamento (sem expor dados sensíveis). */
export async function diagnosticarSeriesArmazenadas() {
  const snapshot = await lerTodasSeriesArmazenadas();
  const empresa = snapshot.empresa || (await obterRegistroDadosEmpresa());
  const backup = lerSeriesBackupEmpresa(empresa);
  const backupAt = empresa?.[DADOS_EMPRESA_SERIES_BACKUP_AT_KEY] || empresa?.dados?.[DADOS_EMPRESA_SERIES_BACKUP_AT_KEY] || null;

  return {
    atual: snapshot.merged.length,
    atualNaoMensais: contarSeriesNaoMensais(snapshot.merged),
    local: snapshot.localRows.length,
    entidade: snapshot.entityRows.length,
    empresa: snapshot.empresaRows.length,
    backup: backup.length,
    backupNaoMensais: contarSeriesNaoMensais(backup),
    backupAt,
  };
}

/**
 * Tenta recuperar contas anuais/trimestrais perdidas a partir de backup e lançamentos.
 * Nunca apaga contas existentes — só une fontes.
 */
export async function recuperarSeriesPerdidas() {
  const snapshot = await lerTodasSeriesArmazenadas();
  const empresa = snapshot.empresa || (await obterRegistroDadosEmpresa());
  const backup = lerSeriesBackupEmpresa(empresa);
  const lancamentos = await listarLancamentosRecorrentes();
  const reconstruidas = reconstruirSeriesDesdeLancamentos(lancamentos, snapshot.merged);

  const antesIds = new Set(snapshot.merged.map((s) => s.id));
  const candidatas = mesclarSeriesPorId(snapshot.merged, backup, reconstruidas);
  const novas = candidatas.filter((s) => !antesIds.has(s.id));
  const naoMensaisNovas = novas.filter(
    (s) => normalizarFrequenciaSerie(s.frequencia) !== FREQUENCIA_SERIE.MENSAL,
  );

  if (novas.length === 0) {
    return {
      recuperadas: 0,
      naoMensais: 0,
      series: snapshot.merged,
      fontes: {
        backup: backup.length,
        reconstruidas: reconstruidas.length,
      },
    };
  }

  const { seriesNorm } = await persistirSeriesModelo(candidatas, { modo: 'substituir' });

  return {
    recuperadas: novas.length,
    naoMensais: naoMensaisNovas.length,
    series: seriesNorm,
    fontes: {
      backup: backup.length,
      reconstruidas: reconstruidas.length,
    },
  };
}

/** Restaura explicitamente o último backup gravado antes de uma persistência. */
export async function restaurarSeriesDoBackup() {
  const empresa = await obterRegistroDadosEmpresa();
  const backup = lerSeriesBackupEmpresa(empresa);
  if (!backup.length) {
    throw new Error('Nenhum backup de contas fixas encontrado para restaurar.');
  }

  const snapshot = await lerTodasSeriesArmazenadas();
  const restauradas = mesclarSeriesPorId(snapshot.merged, backup);
  const { seriesNorm } = await persistirSeriesModelo(restauradas, { modo: 'substituir' });

  return {
    total: seriesNorm.length,
    naoMensais: contarSeriesNaoMensais(seriesNorm),
    series: seriesNorm,
  };
}

/**
 * Atualiza valor e vencimento manualmente (sem ler o boleto).
 * — Com lançamento: grava no LancamentoFinanceiro.
 * — Em planejamento: grava no modelo (cadastro da série).
 */
export async function atualizarCompetenciaManual({ competencia, modelo, valor, dataVencimento, diaVencimento }) {
  const valorNum = Number(valor) || 0;
  if (valorNum < 0) throw new Error('O valor não pode ser negativo.');

  if (competencia?.lancamento_id) {
    const lf = await base44.entities.LancamentoFinanceiro.get(competencia.lancamento_id);
    const tags = new Set([...(lf?.tags || []), 'conta_pagar']);
    tags.delete(TAG_LF_GERADO_AUTO);
    const ven = (dataVencimento || '').slice(0, 10) || lf?.data_vencimento;
    const atualizado = await base44.entities.LancamentoFinanceiro.update(competencia.lancamento_id, {
      valor: valorNum,
      valor_liquido: valorNum,
      data_vencimento: ven,
      tags: [...tags],
    });
    if (modelo?.id) {
      const dia = Number(diaVencimento) || Number((ven || '').slice(8, 10)) || Number(modelo.dia_vencimento) || 10;
      await salvarSerie({
        ...modelo,
        valor_previsto: valorNum,
        dia_vencimento: dia,
      });
    }
    return atualizado;
  }

  if (!modelo?.id) throw new Error('Abra o mês antes de editar o valor desta conta.');

  const dia = Number(diaVencimento) || Number(modelo.dia_vencimento) || 10;
  return salvarSerie({
    ...modelo,
    valor_previsto: valorNum,
    dia_vencimento: dia,
  });
}
