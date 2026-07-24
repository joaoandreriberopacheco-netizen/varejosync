import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/gerarRelatorioMargem.ts';
Deno.serve(servePorted(handle));
