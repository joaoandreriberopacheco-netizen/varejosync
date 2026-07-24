import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/gerarLancamentosCartao.ts';
Deno.serve(servePorted(handle));
