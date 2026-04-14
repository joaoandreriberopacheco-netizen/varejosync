/**
 * Lista TargetFlare com status pending (para caça / confirmação de escopo).
 * Uso (PowerShell), com valores do teu ambiente Base44:
 *   $env:VITE_BASE44_APP_ID="..."
 *   $env:VITE_BASE44_BACKEND_URL="https://base44.app"
 *   $env:BASE44_ACCESS_TOKEN="..."
 *   npm run flare:list
 */
import { fetchPendingTargetFlares, requireFlareClient } from './flare-sdk.mjs';

const base44 = requireFlareClient();
const list = await fetchPendingTargetFlares(base44);
const asJson = process.argv.includes('--json');

if (asJson) {
  console.log(JSON.stringify({ count: list.length, items: list }, null, 2));
  process.exit(0);
}

console.log(`[flare-list] Pendentes: ${list.length}\n`);
list.forEach((item, i) => {
  const pin =
    item.file_path && item.line != null && item.column != null
      ? `${item.file_path}:${item.line}:${item.column}`
      : '(sem pinpoint)';
  const action = item.action_briefing || item.briefing || '(sem texto)';
  console.log(
    `${i + 1}. id=${item.id}\n   confiança: ${item.confidence || '?'}\n   pinpoint: ${pin}\n   rota: ${item.route || '-'}\n   ação: ${action}\n`
  );
});
