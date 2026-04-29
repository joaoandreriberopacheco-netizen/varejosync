const PROVIDERS = {
  BASE44: 'base44',
  SUBPAYZE: 'subpayze',
  SUPABASE: 'supabase'
};

function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return String(value).toLowerCase().trim() === 'true';
}

function nonEmptyString(value) {
  if (value === undefined || value === null) return false;
  return String(value).trim().length > 0;
}

/**
 * `true` quando as envs Base44 estão **realmente** configuradas. Sem appId+serverUrl
 * o SDK Base44 não funciona — qualquer chamada vira fetch para `null/api/apps/null/...`
 * (foi exatamente o que estourava o PDV no Vercel).
 */
export function hasBase44Credentials() {
  const env = import.meta.env || {};
  return nonEmptyString(env.VITE_BASE44_APP_ID) && nonEmptyString(env.VITE_BASE44_BACKEND_URL);
}

/**
 * `true` quando temos URL + ANON_KEY do Supabase no build. Não inicializa client aqui;
 * usado apenas para autodetecção de provider.
 */
export function hasSupabaseCredentials() {
  const env = import.meta.env || {};
  return nonEmptyString(env.VITE_SUPABASE_URL) && nonEmptyString(env.VITE_SUPABASE_ANON_KEY);
}

export function resolveP38ProviderName() {
  const rawProvider = import.meta.env.VITE_P38_PROVIDER;
  const provider = rawProvider ? String(rawProvider).toLowerCase().trim() : '';

  if (provider === PROVIDERS.SUBPAYZE) {
    return PROVIDERS.SUBPAYZE;
  }
  if (provider === PROVIDERS.SUPABASE) {
    return PROVIDERS.SUPABASE;
  }
  if (provider === PROVIDERS.BASE44) {
    return PROVIDERS.BASE44;
  }

  // Provider não definido explicitamente: autodetecta pelo que está disponível.
  // Preferência: Supabase > Base44. Se nenhum dos dois, marca como Base44 (vai cair no stub).
  if (hasSupabaseCredentials() && !hasBase44Credentials()) {
    return PROVIDERS.SUPABASE;
  }
  if (hasSupabaseCredentials() && parseBooleanEnv(import.meta.env.VITE_P38_BYPASS_BASE44, false)) {
    return PROVIDERS.SUPABASE;
  }
  return PROVIDERS.BASE44;
}

export function getP38Providers() {
  return PROVIDERS;
}

export function isP38SafeModeEnabled() {
  return parseBooleanEnv(import.meta.env.VITE_P38_SAFE_MODE, true);
}

export function isSubpayzeRolloutEnabled() {
  return parseBooleanEnv(import.meta.env.VITE_P38_ENABLE_SUBPAYZE, false);
}

export function isSubpayzeReadyForTraffic() {
  return parseBooleanEnv(import.meta.env.VITE_P38_SUBPAYZE_READY, false);
}

/**
 * Quando ativo, o app roda em "modo bypass": o boot não consulta Base44 (auth, public-settings)
 * e o `@base44/sdk` real nunca é instanciado (evita o analytics tracker que vaza fetch para
 * `null/api/apps/null/analytics/track/batch`).
 *
 * Regras (em ordem):
 *   1. provider=supabase → bypass=true (default).
 *   2. VITE_P38_BYPASS_BASE44 explícito → respeita.
 *   3. Sem credenciais Base44 → força bypass=true (proteção contra config incompleta no Vercel).
 *   4. Caso contrário → false (fluxo Base44 normal).
 */
export function isBase44BypassEnabled() {
  if (resolveP38ProviderName() === PROVIDERS.SUPABASE) {
    return parseBooleanEnv(import.meta.env.VITE_P38_BYPASS_BASE44, true);
  }
  if (import.meta.env.VITE_P38_BYPASS_BASE44 !== undefined) {
    return parseBooleanEnv(import.meta.env.VITE_P38_BYPASS_BASE44, false);
  }
  if (!hasBase44Credentials()) {
    return true;
  }
  return false;
}

/**
 * Quando ativo, `auth.me()` tenta `supabase.auth.getUser()` em vez de devolver o mockUser.
 */
export function isSupabaseAuthEnabled() {
  return parseBooleanEnv(import.meta.env.VITE_P38_USE_SUPABASE_AUTH, false);
}
