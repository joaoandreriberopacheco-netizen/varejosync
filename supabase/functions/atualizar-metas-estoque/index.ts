import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/atualizarMetasEstoque.ts';
Deno.serve(servePorted(handle));
