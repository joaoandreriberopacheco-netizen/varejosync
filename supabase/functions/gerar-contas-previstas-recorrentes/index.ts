import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/gerarContasPrevistasRecorrentes.ts';
Deno.serve(servePorted(handle));
