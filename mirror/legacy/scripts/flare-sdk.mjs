/**
 * Cliente Base44 partilhado pelos scripts flare:list / flare:export / flare:api.
 */
import { createClient } from '@base44/sdk';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getBase44Env, loadDotEnvFiles, REPO_ROOT } from './base44-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export { REPO_ROOT };
export const DEFAULT_EXPORT_REL = 'docs/flare-export/flare-pending.json';

export function getFlareEnv() {
  loadDotEnvFiles();
  return getBase44Env();
}

export function tryFlareClient() {
  const { appId, serverUrl, token, apiKey } = getFlareEnv();
  if (!appId || (!token && !apiKey)) return null;
  return createClient({
    appId,
    serverUrl,
    ...(token ? { token } : {}),
    ...(apiKey ? { headers: { api_key: apiKey } } : {}),
    requiresAuth: Boolean(token || apiKey),
  });
}

export function requireFlareClient() {
  const client = tryFlareClient();
  if (!client) {
    console.error(
      '[flare] Defina VITE_BASE44_APP_ID e BASE44_ACCESS_TOKEN (ou BASE44_API_KEY). ' +
        'No browser: Application > Local Storage > base44_access_token / app_id. ' +
        'No Cloud Agent: Secrets do repositório (ver AGENTS.md).'
    );
    process.exit(1);
  }
  return client;
}

export async function fetchPendingTargetFlares(base44) {
  const rows = await base44.entities.TargetFlare.filter({ status: 'pending' }, '-created_date', 500);
  return Array.isArray(rows) ? rows : rows?.data ?? [];
}

export function writeFlareExportFile(items, exportPath = join(REPO_ROOT, DEFAULT_EXPORT_REL)) {
  const dir = dirname(exportPath);
  mkdirSync(dir, { recursive: true });
  const payload = {
    exportedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  writeFileSync(exportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return exportPath;
}
