import { invokeFunction } from './_invokeHelper';

/** Dispara liquidação automática de cartão de crédito (rotina das 09:00 GMT-5). */
export function processarLiquidacaoCartaoCredito(body = {}) {
  return invokeFunction('processarLiquidacaoCartaoCredito', body);
}
