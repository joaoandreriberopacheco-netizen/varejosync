import { listPendingFlaresLocalFirst, resolveFlareById } from '@/features/modo-flare/flareQueue';

function isPurchaseFlare(flare) {
  const file = String(flare?.file_path || '').toLowerCase();
  const route = String(flare?.route || '').toLowerCase();
  const component = String(flare?.component_name || '').toLowerCase();
  const text = `${file} ${route} ${component}`;
  return (
    text.includes('pedidocompra') ||
    text.includes('pedido_compra') ||
    text.includes('pedido-compra') ||
    text.includes('compras')
  );
}

function sortByConfidenceThenRecent(a, b) {
  if (a.confidence !== b.confidence) {
    return a.confidence === 'high' ? -1 : 1;
  }
  const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
  const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
  return tb - ta;
}

function buildPinpoint(flare) {
  const hasCoordinate = Boolean(flare.file_path && flare.line && flare.column);
  return {
    id: flare.id,
    confidence: flare.confidence,
    route: flare.route || '',
    component_name: flare.component_name || '',
    action_briefing: flare.action_briefing || flare.briefing || '',
    context_image_url: flare.context_image_url || '',
    source_location_raw: flare.source_location_raw || '',
    pinpoint: hasCoordinate
      ? `${flare.file_path}:${flare.line}:${flare.column}`
      : `route:${flare.route || 'unknown'} component:${flare.component_name || 'unknown'}`,
  };
}

export async function readPendingFlaresForCursor() {
  const result = await listPendingFlaresLocalFirst();
  return {
    mode: result.mode,
    items: result.items.map(buildPinpoint),
  };
}

export async function readPendingPurchaseFlaresForCursor() {
  const result = await listPendingFlaresLocalFirst();
  const purchase = result.items.filter(isPurchaseFlare).sort(sortByConfidenceThenRecent);
  return {
    mode: result.mode,
    items: purchase.map(buildPinpoint),
  };
}

export async function resolveFlareForCursor(flare) {
  const precision = flare?.confidence === 'high' ? 'high' : 'medium';
  return resolveFlareById(flare, precision);
}
