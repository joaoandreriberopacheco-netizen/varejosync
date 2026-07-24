import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/migrarConferenciaItensLegacy.ts';
Deno.serve(servePorted(handle));
