import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/migrarEmbarqueItensLegacy.ts';
Deno.serve(servePorted(handle));
