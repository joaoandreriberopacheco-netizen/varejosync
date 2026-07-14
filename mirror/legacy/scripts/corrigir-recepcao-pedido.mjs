#!/usr/bin/env node
/**
 * Correção retroativa recepção → estoque (opção A).
 *
 * Uso:
 *   npm run corrigir:recepcao -- --numero=WX7-A5N
 *   npm run corrigir:recepcao -- --numero=WX7-A5N --apply
 */

import { requireFlareClient } from './flare-sdk.mjs';
import { corrigirRecepcaoPedido } from '../src/lib/oneOffCorrigirRecepcaoPedido.js';

function parseArgs(argv) {
  const args = { numero: '', pedidoId: '', apply: false };
  for (const a of argv) {
    if (a === '--apply') args.apply = true;
    else if (a.startsWith('--numero=')) args.numero = a.slice('--numero='.length).trim();
    else if (a.startsWith('--pedido-id=')) args.pedidoId = a.slice('--pedido-id='.length).trim();
  }
  return args;
}

const { numero, pedidoId, apply } = parseArgs(process.argv.slice(2));
if (!numero && !pedidoId) {
  console.error('Indique --numero=WX7-A5N ou --pedido-id=<uuid>');
  process.exit(1);
}

const base44 = requireFlareClient();
const result = await corrigirRecepcaoPedido(base44, { numero, pedidoId, apply });
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
