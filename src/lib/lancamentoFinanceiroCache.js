import { base44 } from '@/api/base44Client';

const CACHE_TTL_MS = 90_000;
const DEFAULT_LIMIT = 8000;

/** @type {{ at: number, data?: unknown[], promise?: Promise<unknown[]> } | null} */
let cacheEntry = null;

export function invalidarCacheLancamentosFinanceiros() {
  cacheEntry = null;
}

/**
 * Busca lançamentos financeiros com cache em memória e deduplicação de requests
 * concorrentes (evita 4–5 chamadas idênticas na Visão Financeira / Planejamento).
 */
export async function listarLancamentosFinanceirosCache({
  sort = '-data_vencimento',
  limit = DEFAULT_LIMIT,
  force = false,
} = {}) {
  const now = Date.now();

  if (!force && cacheEntry?.data && now - cacheEntry.at < CACHE_TTL_MS) {
    return cacheEntry.data;
  }

  if (cacheEntry?.promise) {
    return cacheEntry.promise;
  }

  const fetchLimit = Math.max(Number(limit) || 0, DEFAULT_LIMIT);

  const promise = base44.entities.LancamentoFinanceiro.list(sort, fetchLimit)
    .then((rows) => {
      const data = Array.isArray(rows) ? rows : [];
      cacheEntry = { at: Date.now(), data };
      return data;
    })
    .catch((error) => {
      if (cacheEntry?.data) return cacheEntry.data;
      throw error;
    })
    .finally(() => {
      if (cacheEntry?.promise) {
        const { promise: _p, ...rest } = cacheEntry;
        cacheEntry = rest;
      }
    });

  cacheEntry = { ...(cacheEntry || {}), promise };
  return promise;
}
