import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/migrarBase44ParaSupabase.ts';
Deno.serve(servePorted(handle));
