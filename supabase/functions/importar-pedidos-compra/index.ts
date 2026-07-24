import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/importarPedidosCompra.ts';
Deno.serve(servePorted(handle));
