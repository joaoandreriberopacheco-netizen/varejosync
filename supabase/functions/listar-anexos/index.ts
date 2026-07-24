import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/listarAnexos.ts';
Deno.serve(servePorted(handle));
