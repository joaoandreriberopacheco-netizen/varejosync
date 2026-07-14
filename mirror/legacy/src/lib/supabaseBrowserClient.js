import { createClient } from '@supabase/supabase-js';

let cached;

/**
 * Aceita só a raiz do projeto: `https://<ref>.supabase.co`.
 * Se vier com `/rest/v1` (copiar errado do painel), o supabase-js monta
 * `.../rest/v1/rest/v1/...` e a API responde "Invalid path specified in request URL".
 */
export function normalizeSupabaseProjectUrl(raw) {
  if (raw == null || raw === '') return '';
  let u = String(raw).trim();
  u = u.replace(/\s+/g, '');
  // Remove sufixo /rest/v1 ou /auth/v1 acidental
  u = u.replace(/\/rest\/v1\/?$/i, '');
  u = u.replace(/\/auth\/v1\/?$/i, '');
  u = u.replace(/\/+$/, '');
  return u;
}

/**
 * Cliente Supabase para browser (anon key). Só inicializa se URL + key estiverem definidos.
 */
export function getSupabaseBrowserClient() {
  if (cached !== undefined) {
    return cached;
  }

  const url = normalizeSupabaseProjectUrl(import.meta.env.VITE_SUPABASE_URL || '');
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!url || !anonKey) {
    cached = null;
    return cached;
  }

  if (import.meta.env.DEV && String(import.meta.env.VITE_SUPABASE_URL || '').includes('/rest/v1')) {
    console.warn(
      '[P38] VITE_SUPABASE_URL não deve incluir /rest/v1 — use só a raiz (ex: https://xxxx.supabase.co). Normalizamos automaticamente.'
    );
  }

  cached = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
  return cached;
}

export function isSupabaseBrowserConfigured() {
  const url = normalizeSupabaseProjectUrl(import.meta.env.VITE_SUPABASE_URL || '');
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return Boolean(url && key);
}
