import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/uploadAnexoDrive.ts';
Deno.serve(servePorted(handle));
