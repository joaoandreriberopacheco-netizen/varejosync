import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/migrarPedidoVendaItensLegacy.ts';
Deno.serve(servePorted(handle));
