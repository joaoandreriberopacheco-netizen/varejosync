import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/commitBabelPlugin.ts';
Deno.serve(servePorted(handle));
