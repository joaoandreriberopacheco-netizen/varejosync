import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/listarCatalogoInterface.ts';
Deno.serve(servePorted(handle));
