import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from '@/lib/supabaseBrowserClient';
import { createSupabaseEntityLayer } from './supabaseEntityLayer';

function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return String(value).toLowerCase().trim() === 'true';
}

/**
 * Quando o datalink Supabase está ativo, devolve o mesmo client Base44 com `entities`
 * substituído por uma camada híbrida (Supabase para tabelas mapeadas, Base44 para o resto).
 */
export function resolveLegacyClient(base44SdkClient) {
  const enabled = parseBooleanEnv(import.meta.env.VITE_USE_SUPABASE_ENTITIES, false);
  if (!enabled || !isSupabaseBrowserConfigured()) {
    return base44SdkClient;
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return base44SdkClient;
  }

  const hybridEntities = createSupabaseEntityLayer(base44SdkClient.entities, supabase);

  return new Proxy(base44SdkClient, {
    get(target, prop) {
      if (prop === 'entities') {
        return hybridEntities;
      }
      return target[prop];
    }
  });
}
