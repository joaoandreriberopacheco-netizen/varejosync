import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  MIRROR_EXPORT_KEYWORD,
  MIRROR_EXPORT_STAMP_FILE,
  MIRROR_LIVE_DIR,
  MIRROR_PASS_AGENT_FILE,
  MIRROR_PASS_FILE,
} from './mirror-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function git(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: ROOT }).trim();
  } catch {
    return '';
  }
}

/** Uma só palavra: mirror + commit curto (muda a cada export). */
export function buildMirrorPassWord(shaShort) {
  const sha = String(shaShort || 'unknown').replace(/[^a-zA-Z0-9]/g, '');
  return `mirror${sha}`;
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
  const mirrorPass = buildMirrorPassWord(shaShort);

  const lines = [
    '# Carimbo de export VarejoSync → A29',
    '# Procura no a29-erp: legacy/varejosync/VAREJO_UI_SYNC.stamp',
    `# Palavra-chave (grep): ${MIRROR_EXPORT_KEYWORD}`,
    '',
    `keyword=${MIRROR_EXPORT_KEYWORD}`,
    `export_id=${exportId}`,
    `mirrorpass=${mirrorPass}`,
    `exported_at=${exportedAt}`,
    `varejosync_remote=${remote}`,
    `varejosync_commit=${shaShort}`,
    `varejosync_commit_full=${shaFull}`,
    `varejosync_branch=${branch}`,
    `exported_by=${author}`,
    `export_tool=npm run mirror:pack`,
    `audit_hint=grep -r "${MIRROR_EXPORT_KEYWORD}" legacy/varejosync/`,
    `mirrorpass_file=legacy/varejosync/${MIRROR_PASS_FILE}`,
    `mirrorpass_note=unico ficheiro; cada sync substitui — sempre o export mais recente`,
  ];

  const stampPath = join(destDir, MIRROR_EXPORT_STAMP_FILE);
  writeFileSync(stampPath, `${lines.join('\n')}\n`, 'utf8');

  const passPath = join(destDir, MIRROR_PASS_FILE);
  writeFileSync(passPath, `${mirrorPass}\n`, 'utf8');

  const agentHelp = [
    'MIRROR_PASS / mirrorpass — sync UI VarejoSync → A29',
    '================================================',
    '',
    'NÃO é a senha do Modo Flare (features/modo-flare).',
    'É o carimbo do export npm run mirror:sync do repo varejosync.',
    '',
    'Ficheiros (sempre o export MAIS RECENTE):',
    `  legacy/varejosync/${MIRROR_PASS_FILE}          ← senha actual (uma palavra)`,
    `  legacy/varejosync/${MIRROR_EXPORT_STAMP_FILE}  ← data, commit, export_id`,
    '',
    `Senha actual neste export: ${mirrorPass}`,
    `export_id: ${exportId}`,
    `exported_at: ${exportedAt}`,
    '',
    'Se mirrorpass não existir → o sync ainda não chegou ao A29.',
    'grep: mirrorpass | MIRROR_PASS | VAREJO_UI_SYNC',
  ].join('\n');

  const agentHelpPath = join(destDir, MIRROR_PASS_AGENT_FILE);
  writeFileSync(agentHelpPath, `${agentHelp}\n`, 'utf8');

  publishLiveStamps(destDir, { exportId, exportedAt, mirrorPass, shaShort });

  return {
    stampPath,
    passPath,
    agentHelpPath,
    exportId,
    shaShort,
    keyword: MIRROR_EXPORT_KEYWORD,
    mirrorPass,
  };
}

/** Copia carimbos para mirror/live/ (versionado no Git para o agente A29 puxar). */
function publishLiveStamps(packDir, meta) {
  const liveDir = join(ROOT, MIRROR_LIVE_DIR);
  mkdirSync(liveDir, { recursive: true });

  for (const name of [MIRROR_PASS_FILE, MIRROR_EXPORT_STAMP_FILE, MIRROR_PASS_AGENT_FILE]) {
    const src = join(packDir, name);
    if (existsSync(src)) cpSync(src, join(liveDir, name));
  }

  const readme = [
    '# mirror/live — carimbo publicado (varejosync)',
    '',
    'O agente **a29-erp** usa estes ficheiros para confirmar o último export.',
    '',
    `mirrorpass actual: ${meta.mirrorPass}`,
    `export_id: ${meta.exportId}`,
    `exported_at: ${meta.exportedAt}`,
    `varejosync_commit: ${meta.shaShort}`,
    '',
    'No A29: legacy/varejosync/ (mesmos nomes de ficheiro)',
    '',
    'Prompt para o agente A29: docs/reference-a29-erp/PROMPT_AGENTE_A29.md',
  ].join('\n');

  writeFileSync(join(liveDir, 'README.md'), `${readme}\n`, 'utf8');
}
