import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/exportFlareToGithub.ts';
Deno.serve(servePorted(handle));
