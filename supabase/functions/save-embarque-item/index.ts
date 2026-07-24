import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/saveEmbarqueItem.ts';
Deno.serve(servePorted(handle));
