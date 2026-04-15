import { base44 } from '@/api/base44Client';

export const LOCAL_PINS_KEY = 'p38_flare_local_pins';

export function readLocalPins() {
  try {
    const raw = localStorage.getItem(LOCAL_PINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalPins(pins) {
  try {
    localStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(pins));
  } catch {
    // noop
  }
}

export function clearLocalPins() {
  try {
    localStorage.removeItem(LOCAL_PINS_KEY);
  } catch {
    // noop
  }
}

function normalizeRemoteFlare(item, index) {
  return {
    id: item.id || `remote-${index}`,
    source_location_raw: item.source_location_raw || '',
    file_path: item.file_path || '',
    line: Number(item.line) || null,
    column: Number(item.column) || null,
    component_name: item.component_name || '',
    route: item.route || '',
    briefing: item.briefing || '',
    action_briefing: item.action_briefing || item.briefing || '',
    context_image_url: item.context_image_url || '',
    confidence: item.confidence === 'medium' ? 'medium' : 'high',
    status: item.status || 'pending',
    scope: 'remote',
    created_at: item.createdAt || item.created_at || null,
  };
}

function normalizeLocalFlare(item, index) {
  return {
    id: item.id || `local-${index}`,
    source_location_raw: item.source_location_raw || '',
    file_path: item.file_path || '',
    line: Number(item.line) || null,
    column: Number(item.column) || null,
    component_name: item.component_name || '',
    route: item.route || '',
    briefing: item.briefing || '',
    action_briefing: item.action_briefing || item.briefing || '',
    context_image_url: item.context_image_url || '',
    confidence: item.confidence === 'medium' ? 'medium' : 'high',
    status: item.status || 'pending',
    scope: 'local',
    created_at: item.created_at || null,
  };
}

function sortPendingFlares(items) {
  return [...items].sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence === 'high' ? -1 : 1;
    }
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
}

export async function listPendingFlaresLocalFirst() {
  try {
    const rows = await base44.entities.TargetFlare.filter({ status: 'pending' });
    const normalized = (Array.isArray(rows) ? rows : []).map(normalizeRemoteFlare);
    return { mode: 'remote', items: sortPendingFlares(normalized), remoteFetchFailed: false };
  } catch {
    const fallback = readLocalPins();
    const normalized = (Array.isArray(fallback) ? fallback : []).map(normalizeLocalFlare);
    return {
      mode: 'local',
      items: sortPendingFlares(normalized.filter((it) => it.status === 'pending')),
      remoteFetchFailed: true,
    };
  }
}

export async function listAllRemoteFlares() {
  const rows = await base44.entities.TargetFlare.list('-created_date', 5000);
  const normalized = (Array.isArray(rows) ? rows : []).map(normalizeRemoteFlare);
  return sortPendingFlares(normalized);
}

export async function purgeAllRemoteFlares() {
  const rows = await listAllRemoteFlares();
  if (!rows.length) return { removed: 0, failed: 0 };
  const settled = await Promise.allSettled(rows.map((item) => base44.entities.TargetFlare.delete(item.id)));
  const removed = settled.filter((item) => item.status === 'fulfilled').length;
  const failed = settled.length - removed;
  return { removed, failed };
}

export async function resolveFlareById(flare, resolutionPrecision = 'unknown') {
  const normalizedPrecision = ['high', 'medium', 'unknown'].includes(resolutionPrecision)
    ? resolutionPrecision
    : 'unknown';
  if (flare?.scope === 'remote' && flare?.id) {
    await base44.entities.TargetFlare.update(flare.id, {
      status: 'resolved',
      resolution_precision: normalizedPrecision,
    });
    return true;
  }
  const current = readLocalPins();
  const next = current.map((item) => {
    if (item.id !== flare?.id) return item;
    return {
      ...item,
      status: 'resolved',
      resolution_precision: normalizedPrecision,
      resolved_at: new Date().toISOString(),
    };
  });
  writeLocalPins(next);
  return true;
}
