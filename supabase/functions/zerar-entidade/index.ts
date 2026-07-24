import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/zerarEntidade.ts';
Deno.serve(servePorted(handle));
