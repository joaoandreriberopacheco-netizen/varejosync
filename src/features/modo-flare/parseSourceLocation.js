/**
 * Parseia o atributo data-source-location injetado pelo @base44/vite-plugin.
 * Formato esperado: "path/to/file.jsx:line:column" (path pode conter ':' em Windows raro;
 * usamos regex no sufixo numérico).
 */

const SUFFIX_RE = /^(.+):(\d+):(\d+)$/;

export function parseDataSourceLocation(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.trim().match(SUFFIX_RE);
  if (!m) return null;
  const file_path = normalizeFilePath(m[1]);
  const line = parseInt(m[2], 10);
  const column = parseInt(m[3], 10);
  if (!Number.isFinite(line) || !Number.isFinite(column)) return null;
  return { file_path, line, column, source_location_raw: raw.trim() };
}

function normalizeFilePath(p) {
  let s = p.replace(/\\/g, '/');
  if (!s.startsWith('src/') && s.includes('/src/')) {
    const i = s.indexOf('/src/');
    s = s.slice(i + 1);
  }
  return s;
}

export function componentNameFromFilePath(file_path) {
  if (!file_path) return 'Desconhecido';
  const base = file_path.split('/').pop() || file_path;
  return base.replace(/\.(jsx?|tsx?)$/i, '') || base;
}
