import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/gerarRelatorioPendencias.ts';
Deno.serve(servePorted(handle));
