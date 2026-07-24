import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/readViteConfig.ts';
Deno.serve(servePorted(handle));
