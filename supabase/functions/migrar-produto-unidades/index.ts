import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/migrarProdutoUnidades.ts';
Deno.serve(servePorted(handle));
