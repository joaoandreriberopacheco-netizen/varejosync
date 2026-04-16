import { createClient } from '@supabase/supabase-js';

let cached;

/**
 * Cliente Supabase para browser (anon key). Só inicializa se URL + key estiverem definidos.
 */
export function getSupabaseBrowserClient() {
  if (cached !== undefined) {
    return cached;
  }

  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !anonKey) {
    cached = null;
    return cached;
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
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
