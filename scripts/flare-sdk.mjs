/**
 * Cliente Base44 partilhado pelos scripts flare:list / flare:export / flare:api.
 */
import { createClient } from '@base44/sdk';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, '..');
export const DEFAULT_EXPORT_REL = 'docs/flare-export/flare-pending.json';

export function getFlareEnv() {
  const appId = process.env.VITE_BASE44_APP_ID || process.env.BASE44_APP_ID || '';
  const serverUrl =
    process.env.VITE_BASE44_BACKEND_URL || process.env.BASE44_BACKEND_URL || 'https://base44.app';
  const token = process.env.BASE44_ACCESS_TOKEN || process.env.ACCESS_TOKEN || '';
  return { appId, serverUrl, token };
}

export function tryFlareClient() {
  const { appId, serverUrl, token } = getFlareEnv();
  if (!appId || !token) return null;
  return createClient({
    appId,
    serverUrl,
    token,
    requiresAuth: true,
  });
}

export function requireFlareClient() {
  const client = tryFlareClient();
  if (!client) {
    console.error(
      '[flare] Defina VITE_BASE44_APP_ID e BASE44_ACCESS_TOKEN (ou ACCESS_TOKEN). ' +
        'No browser: Application > Local Storage > base44_access_token / app_id.'
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
