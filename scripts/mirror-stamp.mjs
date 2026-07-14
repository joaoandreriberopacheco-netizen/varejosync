import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { MIRROR_EXPORT_KEYWORD, MIRROR_EXPORT_STAMP_FILE } from './mirror-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function git(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: ROOT }).trim();
  } catch {
    return '';
  }
}

/**
 * @param {string} destDir — pasta mirror/p38-ui (absoluta)
 */
export function writeMirrorExportStamp(destDir) {
  const shaShort = git('git rev-parse --short HEAD') || 'unknown';
  const shaFull = git('git rev-parse HEAD') || shaShort;
  const branch = git('git branch --show-current') || 'unknown';
  const author = git('git config user.name') || 'unknown';
  const remote = git('git config --get remote.origin.url') || 'unknown';
  const exportedAt = new Date().toISOString();
  const exportId = `${MIRROR_EXPORT_KEYWORD}-${exportedAt.slice(0, 10).replace(/-/g, '')}-${shaShort}`;

  const lines = [
    '# Carimbo de export VarejoSync → A29',
    '# Procura no a29-erp: legacy/varejosync/VAREJO_UI_SYNC.stamp',
    `# Palavra-chave (grep): ${MIRROR_EXPORT_KEYWORD}`,
    '',
    `keyword=${MIRROR_EXPORT_KEYWORD}`,
    `export_id=${exportId}`,
    `exported_at=${exportedAt}`,
    `varejosync_remote=${remote}`,
    `varejosync_commit=${shaShort}`,
    `varejosync_commit_full=${shaFull}`,
    `varejosync_branch=${branch}`,
    `exported_by=${author}`,
    `export_tool=npm run mirror:pack`,
    `audit_hint=grep -r "${MIRROR_EXPORT_KEYWORD}" legacy/varejosync/`,
  ];

  const stampPath = join(destDir, MIRROR_EXPORT_STAMP_FILE);
  writeFileSync(stampPath, `${lines.join('\n')}\n`, 'utf8');

  return { stampPath, exportId, shaShort, keyword: MIRROR_EXPORT_KEYWORD };
}
