import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/gerarRelatorioConsolidadoCompra.ts';
Deno.serve(servePorted(handle));
