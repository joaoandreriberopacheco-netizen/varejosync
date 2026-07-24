/**
 * Lista utilizadores operacionais do Base44 (entidade `User`).
 * Tenta vários modos de auth — API key por vezes devolve só metadados de plataforma sem email.
 */
import { createClient } from '@base44/sdk';

import { getBase44Env } from './base44-env.mjs';

const PAGE_SIZE = 10_000;

function buildClient({ appId, serverUrl, token, apiKey, mode }) {
  const opts = { appId, serverUrl, requiresAuth: false };
  if (mode === 'api_key' && apiKey) {
    return createClient({ ...opts, headers: { api_key: apiKey } });
  }
  if (mode === 'jwt' && token) {
    return createClient({ ...opts, token, requiresAuth: true });
  }
  if (mode === 'jwt+api_key' && token && apiKey) {
    return createClient({
      ...opts,
      token,
      headers: { api_key: apiKey },
      requiresAuth: true,
    });
  }
  return null;
}

function rowEmail(row) {
  return String(row?.email || row?.dados?.email || '')
    .trim()
    .toLowerCase();
}

function isPlatformOnlyRow(row) {
  const email = rowEmail(row);
  if (email) return false;
  const d = { ...row, ...(row?.dados && typeof row.dados === 'object' ? row.dados : {}) };
  if (d.is_service === true || d.is_service === 'true') return true;
  if (d._app_role && !d.perfil_acesso_id && !d.nickname && !d.perfil && !d.full_name) return true;
  return Boolean(d.app_id && !d.perfil_acesso_id && !d.nickname && !d.perfil);
}

export function filterOperationalUserRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((row) => !isPlatformOnlyRow(row));
}

function scoreUserRows(rows) {
  const operational = filterOperationalUserRows(rows);
  const withEmail = operational.filter((r) => rowEmail(r)).length;
  return { total: rows.length, operational: operational.length, withEmail };
}

async function listUserPage(client, limit) {
  const api = client.entities?.User;
  if (!api?.list) return [];
  const all = [];
  let skip = 0;
  while (all.length < limit) {
    const page = Math.min(PAGE_SIZE, limit - all.length);
    const rows = await api.list('-created_date', page, skip);
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) break;
    all.push(...list);
    skip += list.length;
    if (list.length < page) break;
  }
  return all;
}

/**
 * @returns {Promise<{ rows: object[], mode: string, stats: object }>}
 */
export async function fetchBase44OperationalUsers(limit = 10_000) {
  const { appId, serverUrl, token, apiKey } = getBase44Env();
  if (!appId || (!token && !apiKey)) {
    throw new Error('Credenciais Base44 em falta (VITE_BASE44_APP_ID + BASE44_API_KEY ou BASE44_ACCESS_TOKEN).');
  }

  const modes = [];
  if (token) modes.push('jwt');
  if (apiKey) modes.push('api_key');
  if (token && apiKey) modes.push('jwt+api_key');

  let best = { rows: [], mode: '', stats: { withEmail: 0, operational: 0, total: 0 } };
  let lastError = null;

  for (const mode of modes) {
    const client = buildClient({ appId, serverUrl, token, apiKey, mode });
    if (!client) continue;
    try {
      const raw = await listUserPage(client, limit);
      const stats = scoreUserRows(raw);
      const operational = filterOperationalUserRows(raw);
      console.log(
        `[base44-users] auth=${mode}: total=${stats.total} operacionais=${stats.operational} com_email=${stats.withEmail}`
      );
      if (
        stats.withEmail > best.stats.withEmail ||
        (stats.withEmail === best.stats.withEmail && stats.operational > best.stats.operational)
      ) {
        best = { rows: operational, mode, stats: { ...stats, operational: operational.length } };
      }
    } catch (e) {
      lastError = e;
      console.warn(`[base44-users] auth=${mode} falhou: ${e?.message || e}`);
    }
  }

  if (!best.rows.length && lastError) {
    throw lastError;
  }
  return best;
}
