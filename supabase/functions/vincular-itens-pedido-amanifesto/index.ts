import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/vincularItensPedidoAManifesto.ts';
Deno.serve(servePorted(handle));
