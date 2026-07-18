import { base44 } from '@/api/base44Client';
import {
  TAG_LF_GERADO_AUTO,
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
import {
  invalidarCacheLancamentosFinanceiros,
  listarContasPagarAgefinCache,
  listarLancamentosFinanceirosAgefinBruto,
  listarLancamentosVencimentoCompetenciaCache,
} from '@/lib/lancamentoFinanceiroCache';
import { filtrarLancamentosPlanejamento } from '@/lib/agefinConsultaData';
import { competenciaParaIntervalo } from '@/lib/relatorioMargemCalculos';

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

function prioridadeSerieId(id = '') {
  if (String(id).startsWith('serie-recuperada-')) return 1;
  if (String(id).startsWith('serie-import-') || String(id).startsWith('serie-agefin-')) return 2;
  return 10;
}

/** Evita duplicatas do mesmo grupo (import/recuperação vs cadastro manual). */
function deduplicarSeriesPorGrupo(series = []) {
  const porGrupo = new Map();
  const semGrupo = [];

  for (const serie of series || []) {
    const gid = serie?.grupo_lancamento_id;
    if (!gid) {
      semGrupo.push(serie);
      continue;
    }
    const prev = porGrupo.get(gid);
    if (!prev || prioridadeSerieId(serie.id) > prioridadeSerieId(prev.id)) {
      porGrupo.set(gid, serie);
    }
  }

  return [...porGrupo.values(), ...semGrupo];
}

/** Fonte de verdade: entidade + DadosEmpresa (sem localStorage). */
async function lerSeriesNaNuvem() {
  const [empresa, entityRows] = await Promise.all([
    obterRegistroDadosEmpresa(),
    tryListEntitySeries(),
  ]);
  const empresaRows = lerSeriesEmpresa(empresa);
  return deduplicarSeriesPorGrupo(mesclarSeriesPorId(entityRows ?? [], empresaRows));
}

async function lerTodasSeriesArmazenadas() {
  const empresa = await obterRegistroDadosEmpresa();
  const empresaRows = lerSeriesEmpresa(empresa);
  const backupRows = lerSeriesBackupEmpresa(empresa);
  const entityRows = (await tryListEntitySeries()) ?? [];
  const localRows = lerSeriesLocalStorage();
  const merged = await lerSeriesNaNuvem();
  return {
    empresa,
    empresaRows,
    backupRows,
    entityRows,
    localRows,
    merged,
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

/** Sincroniza outras abas/janelas quando o cache local é atualizado após gravação na nuvem. */
export function subscribeSeriesStorageChanges(onChange) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => {
    if (event.key === LS_SERIES_KEY) onChange?.();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

const LS_MIGRACAO_FEITA_KEY = 'p38_agefin_series_migradas_v1';

async function migrarSeriesLocalStorageParaNuvem() {
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(LS_MIGRACAO_FEITA_KEY) === '1') {
    return false;
  }

  const localRows = lerSeriesLocalStorage();
  if (!localRows.length) {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(LS_MIGRACAO_FEITA_KEY, '1');
    return false;
  }

  const naNuvem = await lerSeriesNaNuvem();
  const idsNuvem = new Set(naNuvem.map((s) => s.id));
  const orfaos = localRows.filter((s) => s?.id && !idsNuvem.has(s.id));
  if (!orfaos.length) {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(LS_MIGRACAO_FEITA_KEY, '1');
    return false;
  }

  await persistirSeriesModelo(orfaos, { modo: 'merge' });
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(LS_MIGRACAO_FEITA_KEY, '1');
  return true;
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
  const empresa = await obterRegistroDadosEmpresa();
  const atual = await lerSeriesNaNuvem();

  if (atual.length > 0) {
    await gravarBackupSeries(empresa, atual);
  }

  const incoming = (series || []).map((s) => criarSerieComDefaults(s));
  const seriesNorm =
    modo === 'substituir'
      ? deduplicarSeriesPorGrupo(incoming)
      : deduplicarSeriesPorGrupo(mesclarSeriesPorId(atual, incoming));

  let entityOk = false;
  try {
    await sincronizarSeriesParaEntidade(seriesNorm);
    entityOk = true;
  } catch (error) {
    console.error('[agefin] Falha ao gravar em AgefinSerieModelo:', error);
  }

  let empresaAtualizada = null;
  let empresaOk = false;
  try {
    empresaAtualizada = await atualizarDadosEmpresa(base44, {
      [DADOS_EMPRESA_SERIES_KEY]: seriesNorm,
    });
    const gravadas = lerSeriesEmpresa(empresaAtualizada);
    empresaOk =
      gravadas.length >= seriesNorm.length &&
      seriesNorm.every((serie) => gravadas.some((g) => g.id === serie.id));
  } catch (error) {
    console.error('[agefin] Falha ao gravar em DadosEmpresa:', error);
  }

  if (!entityOk && !empresaOk) {
    throw new Error('Não foi possível gravar as contas fixas na base de dados.');
  }

  salvarSeriesLocalStorage(seriesNorm);

  return {
    seriesNorm,
    empresaRows: lerSeriesEmpresa(empresaAtualizada),
    entityOk,
    empresaOk,
  };
}

async function verificarSeriePersistida(serieId, tentativas = 5) {
  for (let i = 0; i < tentativas; i += 1) {
    const fromEntity = await buscarSerieEntidade(serieId);
    if (fromEntity) return fromEntity;

    const naNuvem = await lerSeriesNaNuvem();
    const found = naNuvem.find((s) => s.id === serieId);
    if (found) return criarSerieComDefaults(found);

    if (i < tentativas - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return null;
}

async function obterSeriesParaEdicao() {
  return lerSeriesNaNuvem();
}

export async function listarModelos() {
  try {
    await migrarSeriesLocalStorageParaNuvem();
  } catch (error) {
    console.warn('[agefin] Falha ao migrar contas fixas do cache local:', error);
  }

  const [naNuvem, lancamentos] = await Promise.all([
    lerSeriesNaNuvem(),
    listarContasPagarAgefinCache(),
  ]);
  const importados = derivarSeriesDeLancamentos(lancamentos);
  const merged = deduplicarSeriesPorGrupo(mesclarSeriesPorId(naNuvem, importados));

  const chavesNuvem = new Set(
    naNuvem.flatMap((s) => [s.grupo_lancamento_id, s.id].filter(Boolean)),
  );
  const temNovos = importados.some((s) => {
    const chaves = [s.grupo_lancamento_id, s.id].filter(Boolean);
    return chaves.some((chave) => !chavesNuvem.has(chave));
  });

  if (temNovos && importados.length) {
    try {
      await persistirSeriesModelo(importados, { modo: 'merge' });
      const aposPersist = await lerSeriesNaNuvem();
      const final = deduplicarSeriesPorGrupo(mesclarSeriesPorId(aposPersist, importados));
      if (final.length) return final;
    } catch (error) {
      console.warn('[agefin] Falha ao persistir séries importadas da AGEFIN:', error);
    }
  }

  if (merged.length) return merged;
  if (importados.length) return importados;
  return naNuvem;
}

export async function salvarSerie(payload) {
  const existente = payload.id
    ? (await obterSeriesParaEdicao()).find((s) => s.id === payload.id)
    : null;
  const body = criarSerieComDefaults({
    ...(existente || {}),
    ...payload,
    id: payload.id || undefined,
    grupo_lancamento_id:
      payload.grupo_lancamento_id || existente?.grupo_lancamento_id || gerarGrupoLancamentoId(),
  });

  let entityRow = null;
  try {
    entityRow = await upsertSerieEntidade(body);
  } catch (error) {
    console.error('[agefin] AgefinSerieModelo indisponível:', error);
  }

  const { seriesNorm, empresaRows } = await persistirSeriesModelo([body]);
  const naRespostaEmpresa = empresaRows.find((s) => s.id === body.id);
  if (naRespostaEmpresa) return criarSerieComDefaults(naRespostaEmpresa);
  if (entityRow?.id) return entityRow;

  const verificada = await verificarSeriePersistida(body.id);
  if (verificada) return verificada;

  throw new Error(
    'Não foi possível gravar a conta na base de dados. Verifique a conexão e tente novamente.',
  );
}

export async function removerSerie(serieId) {
  const series = await obterSeriesParaEdicao();
  const next = series.filter((s) => s.id !== serieId);
  await removerSerieEntidade(serieId);
  await persistirSeriesModelo(next, { modo: 'substituir' });
}

export async function atualizarCentroCustoSerie(serieId, centroCusto) {
  const existente = (await obterSeriesParaEdicao()).find((s) => s.id === serieId);
  if (!existente) throw new Error('Conta não encontrada.');
  const atualizada = criarSerieComDefaults({
    ...existente,
    centro_custo: centroCusto || '',
  });
  await persistirSeriesModelo([atualizada]);
  return atualizada;
}

function chaveGrupoSerie(lf) {
  if (lf?.grupo_lancamento_id) return String(lf.grupo_lancamento_id);
  const nome = String(lf?.descricao || lf?.terceiro_nome || 'conta').trim().toLowerCase();
  const terceiro = String(lf?.terceiro_nome || '').trim().toLowerCase();
  return `avulso-${nome}-${terceiro}`;
}

function derivarSeriesDeLancamentos(lancamentos = []) {
  const byGrupo = new Map();
  for (const lf of lancamentos || []) {
    const gid = chaveGrupoSerie(lf);
    if (!byGrupo.has(gid)) byGrupo.set(gid, []);
    byGrupo.get(gid).push(lf);
  }

  const series = [];
  for (const [gid, rows] of byGrupo) {
    const sorted = [...rows].sort((a, b) =>
      (b.data_vencimento || '').localeCompare(a.data_vencimento || ''),
    );
    const rep = sorted[0];
    const serieId = gid.startsWith('avulso-') ? `serie-agefin-${gid}` : `serie-import-${gid}`;
    series.push(
      criarSerieComDefaults({
        id: serieId,
        nome: rep.descricao || rep.terceiro_nome || 'Conta recorrente',
        terceiro_nome: rep.terceiro_nome || '',
        terceiro_id: rep.terceiro_id || '',
        categoria_id: rep.categoria_id || '',
        categoria_nome: rep.categoria || '',
        valor_previsto: Number(rep.valor) || 0,
        dia_vencimento: Number((rep.data_vencimento || '').slice(8, 10)) || 10,
        mes_vencimento: Number((rep.data_vencimento || '').slice(5, 7)) || new Date().getMonth() + 1,
        frequencia: rep.frequencia_recorrencia || 'Mensal',
        grupo_lancamento_id: rep.grupo_lancamento_id || (gid.startsWith('avulso-') ? undefined : gid),
        ativo: true,
      }),
    );
  }
  return series;
}

/** Importa séries a partir das contas a pagar já existentes no financeiro (fonte AGEFIN). */
export async function sincronizarModelosDesdeLancamentos() {
  const lancamentos = await listarContasPagarAgefinCache();
  const series = derivarSeriesDeLancamentos(lancamentos);
  if (series.length) await persistirSeriesModelo(series, { modo: 'merge' });
  return series;
}

export async function listarLancamentosCompetencia(competencia) {
  const limites = competenciaParaIntervalo(competencia);
  let rows = await listarLancamentosVencimentoCompetenciaCache(competencia);

  if (!rows?.length && limites) {
    const from = limites.from.toISOString().slice(0, 10);
    const to = limites.to.toISOString().slice(0, 10);
    const prefix = String(competencia || '').slice(0, 7);
    const todos = await listarLancamentosFinanceirosAgefinBruto();
    rows = todos.filter((lf) => {
      const venc = String(lf?.data_vencimento || '').slice(0, 10);
      return venc >= from && venc <= to && String(lf?.data_vencimento || '').slice(0, 7) === prefix;
    });
  }

  return filtrarLancamentosPlanejamento(rows);
}

/** Lançamentos recorrentes (conta a pagar) para alimentar a projeção de 12 meses. */
export async function listarLancamentosRecorrentes() {
  const lancamentos = await listarContasPagarAgefinCache();
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
    : (await listarLancamentosRecorrentesCache()).filter(lancamentoRecorrenteContaPagarParaListaBoleto);

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
  const existente = (await listarModelos()).find((s) => s.id === serieId);
  if (!existente) throw new Error('Conta não encontrada.');
  const encerrada = criarSerieComDefaults({
    ...existente,
    situacao: 'encerrada',
    data_encerramento: dataEncerramento,
    ativo: false,
  });
  await persistirSeriesModelo([encerrada]);
  return encerrada;
}

export async function reativarSerie(serieId) {
  const existente = (await listarModelos()).find((s) => s.id === serieId);
  if (!existente) throw new Error('Conta não encontrada.');
  const reativada = criarSerieComDefaults({
    ...existente,
    situacao: 'ativa',
    data_encerramento: null,
    ativo: true,
  });
  await persistirSeriesModelo([reativada]);
  return reativada;
}

export function podeEditarCompetencia(comp) {
  return comp && !competenciaBloqueadaEdicao(comp);
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
