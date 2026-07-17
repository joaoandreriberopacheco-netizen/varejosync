import { base44 } from '@/api/base44Client';
import { atualizarDadosEmpresa, obterRegistroDadosEmpresa } from '@/lib/dadosEmpresaMerge';
import {
  gerarParcelamentoId,
  gerarParcelasProposta,
  normalizarParcelamento,
  parcelamentoPorSerieCompetencia,
} from '@/lib/agefinParcelamentoCalculos';

const DADOS_EMPRESA_KEY = 'agefin_parcelamentos';
const LS_KEY = 'p38_agefin_parcelamentos_v1';

function lerLocalStorage() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvarLocalStorage(rows) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows || []));
  } catch {
    /* quota */
  }
}

function lerEmpresa(empresa) {
  if (!empresa) return [];
  const raw =
    empresa[DADOS_EMPRESA_KEY] ??
    (empresa.dados && typeof empresa.dados === 'object'
      ? empresa.dados[DADOS_EMPRESA_KEY]
      : undefined);
  return Array.isArray(raw) ? raw : [];
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

async function persistir(rows) {
  salvarLocalStorage(rows);
  try {
    await atualizarDadosEmpresa(base44, { [DADOS_EMPRESA_KEY]: rows });
  } catch (error) {
    console.error('[agefin] Falha ao gravar parcelamentos:', error);
  }
  return rows;
}

export async function listarParcelamentos() {
  const empresa = await obterRegistroDadosEmpresa(base44);
  const empresaRows = lerEmpresa(empresa);
  const localRows = lerLocalStorage();
  return mesclarPorId(localRows, empresaRows).map((p) => normalizarParcelamento(p)).filter(Boolean);
}

export async function criarParcelamento({
  serieId,
  competenciaOrigem,
  valorOriginal,
  jurosMulta = 0,
  totalParcelas,
  diaVencimento,
  modelo,
}) {
  const existente = parcelamentoPorSerieCompetencia(
    await listarParcelamentos(),
    serieId,
    competenciaOrigem,
  );
  if (existente) {
    throw new Error('Esta conta já está parcelada neste mês. Edite o parcelamento existente.');
  }

  const parcelas = gerarParcelasProposta({
    competenciaOrigem,
    valorOriginal,
    jurosMulta,
    totalParcelas,
    diaVencimento,
  });

  const novo = normalizarParcelamento(
    {
      id: gerarParcelamentoId(),
      serie_id: serieId,
      competencia_origem: competenciaOrigem,
      valor_original: valorOriginal,
      juros_multa: jurosMulta,
      total_parcelas: parcelas.length,
      ativo: true,
      parcelas,
    },
    modelo,
  );

  const todos = await listarParcelamentos();
  const next = [...todos.filter((p) => p.id !== novo.id), novo];
  await persistir(next);
  return novo;
}

export async function atualizarParcela(parcelamentoId, parcelaNumero, patch) {
  const todos = await listarParcelamentos();
  const idx = todos.findIndex((p) => p.id === parcelamentoId);
  if (idx < 0) throw new Error('Parcelamento não encontrado.');

  const parc = { ...todos[idx] };
  parc.parcelas = (parc.parcelas || []).map((par) => {
    if (par.numero !== parcelaNumero) return par;
    const dia = patch.diaVencimento ?? par.dia_vencimento;
    const competencia = patch.competencia || par.competencia;
    return {
      ...par,
      valor: patch.valor != null ? Number(patch.valor) : par.valor,
      competencia: String(competencia).slice(0, 7),
      dia_vencimento: dia,
      data_vencimento: patch.dataVencimento || par.data_vencimento,
    };
  });

  todos[idx] = normalizarParcelamento(parc);
  await persistir(todos);
  return todos[idx];
}

export async function removerParcelamento(parcelamentoId) {
  const todos = await listarParcelamentos();
  const next = todos.map((p) =>
    p.id === parcelamentoId ? { ...p, ativo: false } : p,
  );
  await persistir(next);
  return true;
}
