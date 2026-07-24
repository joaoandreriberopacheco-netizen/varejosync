import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/saveConferenciaItem.ts';
Deno.serve(servePorted(handle));
