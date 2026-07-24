import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/validateConferenceCode.ts';
Deno.serve(servePorted(handle));
