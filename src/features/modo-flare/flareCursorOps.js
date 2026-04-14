import { listPendingFlaresLocalFirst, resolveFlareById } from '@/features/modo-flare/flareQueue';

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

export async function resolveFlareForCursor(flare) {
  const precision = flare?.confidence === 'high' ? 'high' : 'medium';
  return resolveFlareById(flare, precision);
}
