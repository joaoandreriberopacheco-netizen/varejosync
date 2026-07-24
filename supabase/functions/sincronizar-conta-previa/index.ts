import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/sincronizarContaPrevia.ts';
Deno.serve(servePorted(handle));
