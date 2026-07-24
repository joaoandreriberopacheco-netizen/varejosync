import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/gerarRelatorioPedidosCompra.ts';
Deno.serve(servePorted(handle));
