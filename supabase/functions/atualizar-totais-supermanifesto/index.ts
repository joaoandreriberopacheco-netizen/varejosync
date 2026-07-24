import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/atualizarTotaisSupermanifesto.ts';
Deno.serve(servePorted(handle));
