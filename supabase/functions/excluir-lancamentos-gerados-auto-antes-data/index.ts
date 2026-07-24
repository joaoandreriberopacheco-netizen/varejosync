import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/excluirLancamentosGeradosAutoAntesData.ts';
Deno.serve(servePorted(handle));
