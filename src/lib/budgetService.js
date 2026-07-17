import { base44 } from '@/api/base44Client';
import { atualizarDadosEmpresa, obterRegistroDadosEmpresa } from '@/lib/dadosEmpresaMerge';
import {
  criarCompetenciaComDefaults,
  criarModeloComDefaults,
  filtrarLancamentosBudgetMes,
  lancamentoElegivelBudget,
} from '@/lib/budgetCalculos';
import { listarCentrosCustoRegistros } from '@/lib/folhaPrevisaoService';

export { listarCentrosCustoRegistros };

const DADOS_EMPRESA_MODELOS_KEY = 'budget_modelos';
const DADOS_EMPRESA_COMPETENCIAS_KEY = 'budget_competencias';
const LS_MODELOS_KEY = 'p38_budget_modelos_v1';
const LS_COMPETENCIAS_KEY = 'p38_budget_competencias_v1';

function lerArrayEmpresa(empresa, key) {
  if (!empresa) return [];
  const raw =
    empresa[key] ??
    (empresa.dados && typeof empresa.dados === 'object' ? empresa.dados[key] : undefined);
  return Array.isArray(raw) ? raw : [];
}

function lerLocalStorage(key) {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvarLocalStorage(key, rows) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(rows || []));
  } catch {
    /* quota */
  }
}

function mesclarPorId(...listas) {
  const map = new Map();
  for (const lista of listas) {
    for (const row of lista || []) {
      if (!row?.id) continue;
      map.set(row.id, { ...map.get(row.id), ...row });
    }
  }
  return [...map.values()];
}

async function tryListEntity(apiName) {
  try {
    const api = base44.entities?.[apiName];
    if (!api?.list) return null;
    const rows = await api.list('-created_date');
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

async function upsertEntity(apiName, row, normalizer) {
  const api = base44.entities?.[apiName];
  if (!api?.create) return null;
  const body = normalizer(row);
  let existente = [];
  try {
    existente = (await api.filter?.({ id: body.id })) || [];
  } catch {
    try {
      const one = await api.get?.(body.id);
      if (one?.id) existente = [one];
    } catch {
      /* novo */
    }
  }
  if (existente?.length) {
    return normalizer(await api.update(body.id, body));
  }
  return normalizer(await api.create(body));
}

async function deleteEntity(apiName, id) {
  try {
    const api = base44.entities?.[apiName];
    if (!api?.delete || !id) return false;
    await api.delete(id);
    return true;
  } catch {
    return false;
  }
}

async function lerModelosArmazenados() {
  const empresa = await obterRegistroDadosEmpresa(base44);
  const empresaRows = lerArrayEmpresa(empresa, DADOS_EMPRESA_MODELOS_KEY);
  const entityRows = (await tryListEntity('BudgetModelo')) ?? [];
  const localRows = lerLocalStorage(LS_MODELOS_KEY);
  return {
    empresa,
    merged: mesclarPorId(localRows, entityRows, empresaRows).map(criarModeloComDefaults),
  };
}

async function persistirModelos(modelos) {
  const norm = (modelos || []).map(criarModeloComDefaults);
  salvarLocalStorage(LS_MODELOS_KEY, norm);
  await atualizarDadosEmpresa(base44, { [DADOS_EMPRESA_MODELOS_KEY]: norm });
  for (const m of norm) {
    await upsertEntity('BudgetModelo', m, criarModeloComDefaults);
  }
  return norm;
}

async function lerCompetenciasArmazenadas(competencia) {
  const empresa = await obterRegistroDadosEmpresa(base44);
  const empresaRows = lerArrayEmpresa(empresa, DADOS_EMPRESA_COMPETENCIAS_KEY);
  const entityRows = competencia
    ? ((await (async () => {
        try {
          const api = base44.entities?.BudgetCompetencia;
          if (!api?.filter) return null;
          return await api.filter({ competencia });
        } catch {
          return null;
        }
      })()) ?? [])
    : ((await tryListEntity('BudgetCompetencia')) ?? []);
  const localRows = lerLocalStorage(LS_COMPETENCIAS_KEY);
  const merged = mesclarPorId(localRows, entityRows, empresaRows).map(criarCompetenciaComDefaults);
  return competencia ? merged.filter((c) => c.competencia === competencia) : merged;
}

async function persistirCompetencias(competencias) {
  const norm = (competencias || []).map(criarCompetenciaComDefaults);
  salvarLocalStorage(LS_COMPETENCIAS_KEY, norm);
  await atualizarDadosEmpresa(base44, { [DADOS_EMPRESA_COMPETENCIAS_KEY]: norm });
  for (const c of norm) {
    await upsertEntity('BudgetCompetencia', c, criarCompetenciaComDefaults);
  }
  return norm;
}

export async function listarModelos() {
  const { merged } = await lerModelosArmazenados();
  return merged;
}

export async function salvarModelo(partial) {
  const { merged } = await lerModelosArmazenados();
  const body = criarModeloComDefaults(partial);
  const idx = merged.findIndex((m) => m.id === body.id);
  const next = [...merged];
  if (idx >= 0) next[idx] = { ...next[idx], ...body };
  else next.push(body);
  return (await persistirModelos(next)).find((m) => m.id === body.id);
}

export async function removerModelo(modeloId) {
  const { merged } = await lerModelosArmazenados();
  const next = merged.filter((m) => m.id !== modeloId);
  await persistirModelos(next);
  await deleteEntity('BudgetModelo', modeloId);

  const comps = await lerCompetenciasArmazenadas();
  const compsNext = comps.filter((c) => c.budget_modelo_id !== modeloId);
  await persistirCompetencias(compsNext);
}

export async function listarCompetencias(competencia) {
  return lerCompetenciasArmazenadas(competencia);
}

export async function salvarAjusteCompetencia(budgetModeloId, competencia, { valorAjustado, motivoAjuste }) {
  const comps = await lerCompetenciasArmazenadas();
  const id = `${budgetModeloId}:${competencia}`;
  const existente = comps.find((c) => c.budget_modelo_id === budgetModeloId && c.competencia === competencia);
  const body = criarCompetenciaComDefaults({
    ...existente,
    id: existente?.id || id,
    budget_modelo_id: budgetModeloId,
    competencia,
    valor_ajustado: valorAjustado != null && valorAjustado !== '' ? Number(valorAjustado) : null,
    motivo_ajuste: motivoAjuste || '',
  });
  const next = comps.filter((c) => c.budget_modelo_id !== budgetModeloId || c.competencia !== competencia);
  next.push(body);
  return (await persistirCompetencias(next)).find((c) => c.id === body.id);
}

export async function listarLancamentosMes(competencia) {
  const lancamentos = await base44.entities.LancamentoFinanceiro.list('-data_pagamento', 8000);
  return filtrarLancamentosBudgetMes(lancamentos, competencia);
}

export async function listarLancamentosDespesas(competencia) {
  const mes = await listarLancamentosMes(competencia);
  return mes.filter(lancamentoElegivelBudget);
}

export async function listarCategoriasDespesa() {
  const cats = await base44.entities.CategoriaFinanceira.list();
  return (cats || []).filter((c) => c.tipo === 'Despesa' && c.ativo !== false && c.ativa !== false);
}
