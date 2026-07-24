/**
 * Helpers de autenticação Supabase (OAuth Google, callback).
 */

export function safeAppReturnPath(raw) {
  if (!raw || typeof raw !== 'string') return '/';
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}

/** URL de retorno após OAuth Google (rota interna `/auth/callback`). */
export function buildSupabaseOAuthCallbackUrl(returnPath = '/') {
  if (typeof window === 'undefined') return '/auth/callback';
  const safe = safeAppReturnPath(returnPath);
  const base = `${window.location.origin}/auth/callback`;
  if (safe === '/') return base;
  return `${base}?returnUrl=${encodeURIComponent(safe)}`;
}
