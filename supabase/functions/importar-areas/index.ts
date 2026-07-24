import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/importarAreas.ts';
Deno.serve(servePorted(handle));
