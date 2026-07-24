import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/integrarPedidosEmbarques.ts';
Deno.serve(servePorted(handle));
