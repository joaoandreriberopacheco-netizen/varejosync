import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/importarProdutos.ts';
Deno.serve(servePorted(handle));
