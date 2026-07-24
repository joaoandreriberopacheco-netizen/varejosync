import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/savePedidoVendaItem.ts';
Deno.serve(servePorted(handle));
