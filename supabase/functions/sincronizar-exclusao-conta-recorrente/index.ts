import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/sincronizarExclusaoContaRecorrente.ts';
Deno.serve(servePorted(handle));
