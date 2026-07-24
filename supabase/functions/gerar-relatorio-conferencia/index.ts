import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/gerarRelatorioConferencia.ts';
Deno.serve(servePorted(handle));
