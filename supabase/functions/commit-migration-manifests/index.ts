import { servePorted } from '../_shared/servePorted.ts';
import { handle } from '../_shared/handlers/commitMigrationManifests.ts';
Deno.serve(servePorted(handle));
