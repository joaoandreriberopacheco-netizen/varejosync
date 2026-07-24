import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/migrarPedidoCompraItensLegacy.ts';
Deno.serve(servePorted(handle));
