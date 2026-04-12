import { invokeFunction } from './_invokeHelper';

/**
 * Invoca a função server-side `gerenciarPin` (base44/functions/gerenciarPin).
 */
export function gerenciarPin(body) {
  return invokeFunction('gerenciarPin', body);
}
