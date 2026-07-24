import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/savePedidoCompraItem.ts';
Deno.serve(servePorted(handle));
