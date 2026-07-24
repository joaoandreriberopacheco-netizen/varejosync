import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/automacaoAprovacaoFinanceira.ts';
Deno.serve(servePorted(handle));
