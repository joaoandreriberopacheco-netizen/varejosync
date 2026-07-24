import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/normalizarPedidosCompraPendentes.ts';
Deno.serve(servePorted(handle));
