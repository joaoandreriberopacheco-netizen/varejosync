import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/listFlarePending.ts';
Deno.serve(servePorted(handle));
