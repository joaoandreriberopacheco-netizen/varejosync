import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/imprimirCupomTermico.ts';
Deno.serve(servePorted(handle));
