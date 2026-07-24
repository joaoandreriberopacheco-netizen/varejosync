import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/syncCodebaseToGithub.ts';
Deno.serve(servePorted(handle));
