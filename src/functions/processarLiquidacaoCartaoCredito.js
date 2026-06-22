import { invokeFunction } from './_invokeHelper';

/** Dispara liquidação automática de cartão débito/crédito (rotina das 08:00 GMT-5). */
export function processarLiquidacaoCartaoCredito(body = {}) {
  return invokeFunction('processarLiquidacaoCartaoCredito', body);
}
