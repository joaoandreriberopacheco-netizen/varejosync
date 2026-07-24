import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/registrarGatilhoSupermanifesto.ts';
Deno.serve(servePorted(handle));
