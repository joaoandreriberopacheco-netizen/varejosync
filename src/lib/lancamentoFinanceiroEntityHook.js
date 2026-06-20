import { prepararMetadadosLancamentoFinanceiro } from '@/lib/financialUtils';
import { mergeTagsOrdem } from '@/lib/lancamentoOrdemMeta';

const ENRICHED = Symbol('lancamentoFinanceiroEnriched');

function enrichOrdemPayload(payload) {
  const meta = prepararMetadadosLancamentoFinanceiro({ dataLancamento: payload.data_lancamento });
  const codigo = payload.codigo_lancamento || meta.codigo_lancamento;
  return {
    ...payload,
    data_lancamento: payload.data_lancamento ?? meta.data_lancamento,
    codigo_lancamento: codigo,
    tags: mergeTagsOrdem(payload.tags, codigo),
  };
}

function enrichCreatePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  return enrichOrdemPayload(payload);
}

function enrichUpdatePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  if ('data_lancamento' in payload || 'codigo_lancamento' in payload) {
    return enrichOrdemPayload(payload);
  }
  return payload;
}

/**
 * Garante metadados de ordenação em create/update de LancamentoFinanceiro.
 * Inclui tag `__ordem:AAAAMMDDHHMMSS` para persistir no Base44 legado (sem colunas novas).
 */
export function wrapLegacyClientLancamentoFinanceiro(client) {
  if (!client?.entities?.LancamentoFinanceiro) return client;

  const entity = client.entities.LancamentoFinanceiro;
  if (entity[ENRICHED]) return client;

  const originalCreate = entity.create?.bind(entity);
  const originalBulkCreate = entity.bulkCreate?.bind(entity);
  const originalUpdate = entity.update?.bind(entity);
  const originalBulkUpdate = entity.bulkUpdate?.bind(entity);

  if (originalCreate) {
    entity.create = async (payload) => originalCreate(enrichCreatePayload(payload));
  }

  if (originalBulkCreate) {
    entity.bulkCreate = async (payloads) => originalBulkCreate((payloads || []).map(enrichCreatePayload));
  }

  if (originalUpdate) {
    entity.update = async (id, payload) => originalUpdate(id, enrichUpdatePayload(payload));
  }

  if (originalBulkUpdate) {
    entity.bulkUpdate = async (updates) => originalBulkUpdate(
      (updates || []).map((item) => ({
        ...item,
        data: enrichUpdatePayload(item.data),
      })),
    );
  }

  entity[ENRICHED] = true;
  return client;
}
