import { base44 } from '@/api/base44Client';

const CACHE_TTL_MS = 90_000;
const DEFAULT_LIMIT = 8000;

/** @type {Map<string, { at: number, data?: unknown[], promise?: Promise<unknown[]> }>} */
const cache = new Map();

function cacheKey(sort, limit) {
  return `${sort}:${limit}`;
}

export function invalidarCacheLancamentosFinanceiros() {
  cache.clear();
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
  const key = cacheKey(sort, limit);
  const now = Date.now();
  const entry = cache.get(key);

  if (!force && entry?.data && now - entry.at < CACHE_TTL_MS) {
    return entry.data;
  }

  if (entry?.promise) {
    return entry.promise;
  }

  const promise = base44.entities.LancamentoFinanceiro.list(sort, limit)
    .then((rows) => {
      const data = Array.isArray(rows) ? rows : [];
      cache.set(key, { at: Date.now(), data });
      return data;
    })
    .catch((error) => {
      const stale = cache.get(key);
      if (stale?.data) return stale.data;
      throw error;
    })
    .finally(() => {
      const current = cache.get(key);
      if (current?.promise) {
        const { promise: _p, ...rest } = current;
        cache.set(key, rest);
      }
    });

  cache.set(key, { ...(entry || {}), promise });
  return promise;
}
