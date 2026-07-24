import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/forcarEmbarqueOrfao.ts';
Deno.serve(servePorted(handle));
