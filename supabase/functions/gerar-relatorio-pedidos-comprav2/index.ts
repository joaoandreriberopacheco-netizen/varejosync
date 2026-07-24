import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/gerarRelatorioPedidosComprav2.ts';
Deno.serve(servePorted(handle));
