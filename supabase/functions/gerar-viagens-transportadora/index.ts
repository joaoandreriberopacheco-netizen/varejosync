import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/gerarViagensTransportadora.ts';
Deno.serve(servePorted(handle));
