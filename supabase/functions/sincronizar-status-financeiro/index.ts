import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/sincronizarStatusFinanceiro.ts';
Deno.serve(servePorted(handle));
