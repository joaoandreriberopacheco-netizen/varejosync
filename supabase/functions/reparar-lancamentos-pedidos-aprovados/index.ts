import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/repararLancamentosPedidosAprovados.ts';
Deno.serve(servePorted(handle));
