import { invokeFunction } from './_invokeHelper';

/** Dispara liquidação automática de cartão débito/crédito (rotina das 09:00 GMT-5). */
export function processarLiquidacaoCartaoCredito(body = {}) {
  return invokeFunction('processarLiquidacaoCartaoCredito', body);
}
