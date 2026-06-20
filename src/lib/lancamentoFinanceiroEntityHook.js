import { prepararMetadadosLancamentoFinanceiro } from '@/lib/financialUtils';

const ENRICHED = Symbol('lancamentoFinanceiroEnriched');

function enrichCreatePayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.codigo_lancamento) {
    return payload;
  }
  const meta = prepararMetadadosLancamentoFinanceiro({ dataLancamento: payload.data_lancamento });
  return { ...payload, ...meta };
}

function enrichUpdatePayload(payload) {
  if (!payload || typeof payload !== 'object' || !('data_lancamento' in payload)) {
    return payload;
  }
  const meta = prepararMetadadosLancamentoFinanceiro({ dataLancamento: payload.data_lancamento });
  return { ...payload, ...meta };
}

/**
 * Garante `data_lancamento` + `codigo_lancamento` em create/update de LancamentoFinanceiro.
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
