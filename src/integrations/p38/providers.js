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

export function resolveP38ProviderName() {
  const rawProvider = import.meta.env.VITE_P38_PROVIDER || PROVIDERS.BASE44;
  const provider = String(rawProvider).toLowerCase().trim();

  if (provider === PROVIDERS.SUBPAYZE) {
    return PROVIDERS.SUBPAYZE;
  }

  if (provider === PROVIDERS.SUPABASE) {
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
 * Quando ativo, o app roda em "modo bypass": o boot não consulta Base44 (auth, public-settings).
 * Útil para hospedar somente em Vercel + Supabase. `auth.me()` devolve o mockUser configurado
 * em VITE_P38_BYPASS_USER_* até o login Supabase real estar pronto.
 */
export function isBase44BypassEnabled() {
  if (resolveP38ProviderName() === PROVIDERS.SUPABASE) {
    return parseBooleanEnv(import.meta.env.VITE_P38_BYPASS_BASE44, true);
  }
  return parseBooleanEnv(import.meta.env.VITE_P38_BYPASS_BASE44, false);
}

/**
 * Quando ativo, `auth.me()` tenta `supabase.auth.getUser()` em vez de devolver o mockUser.
 */
export function isSupabaseAuthEnabled() {
  return parseBooleanEnv(import.meta.env.VITE_P38_USE_SUPABASE_AUTH, false);
}
