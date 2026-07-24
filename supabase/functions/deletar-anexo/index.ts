import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/deletarAnexo.ts';
Deno.serve(servePorted(handle));
