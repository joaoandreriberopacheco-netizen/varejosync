import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/gerarRelatorioContasAbertas.ts';
Deno.serve(servePorted(handle));
