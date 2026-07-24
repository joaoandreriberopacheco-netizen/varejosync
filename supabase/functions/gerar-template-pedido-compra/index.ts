import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/gerarTemplatePedidoCompra.ts';
Deno.serve(servePorted(handle));
