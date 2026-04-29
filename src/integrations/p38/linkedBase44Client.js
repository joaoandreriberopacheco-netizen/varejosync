import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from '@/lib/supabaseBrowserClient';
import { createSupabaseEntityLayer } from './supabaseEntityLayer';
import { createSupabaseLegacyClient } from './supabaseAdapter';
import { getP38Providers, resolveP38ProviderName } from './providers';

function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return String(value).toLowerCase().trim() === 'true';
}

/**
 * Devolve o client legado a ser exposto como `p38.legacyClient` (e, por compat, `base44`).
 *
 * 3 modos:
 *   1. provider=supabase → pseudo-client 100% Supabase (zero chamada ao Base44).
 *   2. provider=base44 + VITE_USE_SUPABASE_ENTITIES=true → híbrido: entidades mapeadas no
 *      Supabase, restante (auth, funções, entidades não mapeadas) ainda no Base44.
 *   3. caso contrário → client Base44 puro.
 */
export function resolveLegacyClient(base44SdkClient) {
  const providers = getP38Providers();
  const providerName = resolveP38ProviderName();

  if (providerName === providers.SUPABASE) {
    if (!isSupabaseBrowserConfigured()) {
      console.warn(
        '[P38] VITE_P38_PROVIDER=supabase definido, mas VITE_SUPABASE_URL/ANON_KEY ausentes — ' +
          'caindo no client Base44 para evitar tela branca.'
      );
      return base44SdkClient;
    }
    return createSupabaseLegacyClient();
  }

  const datalinkEnabled = parseBooleanEnv(import.meta.env.VITE_USE_SUPABASE_ENTITIES, false);
  if (!datalinkEnabled || !isSupabaseBrowserConfigured()) {
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
