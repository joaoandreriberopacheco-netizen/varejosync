/**
 * Grava docs/flare-export/flare-pending.json para o Cursor ler a fila pendente.
 * Mesmas variáveis de ambiente que flare:list.
 */
import { isAbsolute, join } from 'path';
import {
  DEFAULT_EXPORT_REL,
  fetchPendingTargetFlares,
  requireFlareClient,
  REPO_ROOT,
  writeFlareExportFile,
} from './flare-sdk.mjs';

const base44 = requireFlareClient();
const items = await fetchPendingTargetFlares(base44);
const outArg = process.argv.find((a) => a.startsWith('--out='));
const rawOut = outArg ? outArg.slice('--out='.length) : '';
const exportPath = rawOut
  ? isAbsolute(rawOut)
    ? rawOut
    : join(REPO_ROOT, rawOut)
  : join(REPO_ROOT, DEFAULT_EXPORT_REL);
const written = writeFlareExportFile(items, exportPath);
console.log(`[flare-export] ${items.length} pendente(s) → ${written}`);
