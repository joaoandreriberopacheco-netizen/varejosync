import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/sincronizarViagensTransportadora.ts';
Deno.serve(servePorted(handle));
