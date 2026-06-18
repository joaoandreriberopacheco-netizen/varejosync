import { prepararMetadadosLancamentoFinanceiro } from '@/lib/financialUtils';

const ENRICHED = Symbol('lancamentoFinanceiroEnriched');

function enrichPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.codigo_lancamento) {
    return payload;
  }
  const meta = prepararMetadadosLancamentoFinanceiro({ dataLancamento: payload.data_lancamento });
  return { ...payload, ...meta };
}

/**
 * Garante `data_lancamento` + `codigo_lancamento` em todo create/bulkCreate
 * de LancamentoFinanceiro via `base44.entities`.
 */
export function wrapLegacyClientLancamentoFinanceiro(client) {
  if (!client?.entities?.LancamentoFinanceiro) return client;

  const entity = client.entities.LancamentoFinanceiro;
  if (entity[ENRICHED]) return client;

  const originalCreate = entity.create?.bind(entity);
  const originalBulkCreate = entity.bulkCreate?.bind(entity);

  if (originalCreate) {
    entity.create = async (payload) => originalCreate(enrichPayload(payload));
  }

  if (originalBulkCreate) {
    entity.bulkCreate = async (payloads) => originalBulkCreate((payloads || []).map(enrichPayload));
  }

  entity[ENRICHED] = true;
  return client;
}
