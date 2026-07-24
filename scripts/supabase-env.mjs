/**
 * Resolve credenciais Supabase a partir de vários nomes de secret (Cursor/GitHub).
 */
import { loadDotEnvFiles } from './base44-env.mjs';

loadDotEnvFiles();

function parseProjectRefFromDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    const host = new URL(databaseUrl.replace(/^postgresql:/, 'postgres:')).hostname;
    const pooler = host.match(/^postgres\.([^.]+)\./);
    if (pooler) return pooler[1];
    if (host.startsWith('db.') && host.endsWith('.supabase.co')) {
      return host.slice(3, -'.supabase.co'.length);
    }
    const direct = host.match(/^([^.]+)\.supabase\.co$/);
    return direct ? direct[1] : null;
  } catch {
    return null;
  }
}

/** @returns {{ databaseUrl?: string, accessToken?: string, projectRef?: string }} */
export function resolveSupabaseDeployEnv() {
  const rawSupabase = process.env.supabase?.trim();
  const accessToken =
    process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
    process.env.SUPABASE_TOKEN?.trim() ||
    (rawSupabase?.startsWith('sbp_') ? rawSupabase : '');

  let databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl && rawSupabase?.startsWith('postgres')) {
    databaseUrl = rawSupabase;
  }

  let projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    parseProjectRefFromDatabaseUrl(databaseUrl) ||
    null;

  if (!projectRef) {
    const url = process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
    if (url) {
      try {
        projectRef = new URL(url).hostname.split('.')[0] || null;
      } catch {
        /* ignore */
      }
    }
  }

  return { databaseUrl, accessToken, projectRef };
}
