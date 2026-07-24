import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/calcularIEP.ts';
Deno.serve(servePorted(handle));
