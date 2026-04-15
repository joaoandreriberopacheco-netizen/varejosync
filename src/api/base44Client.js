import { p38 } from '@/integrations/p38';

// Compatibilidade: mantemos o nome "base44" enquanto migramos imports.
export const base44 = p38.legacyClient;
export { p38 };
