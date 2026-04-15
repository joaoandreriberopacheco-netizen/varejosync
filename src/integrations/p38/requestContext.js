export function createRequestId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // noop: fallback below
  }

  return `p38-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function createRequestContext(extra = {}) {
  return {
    requestId: createRequestId(),
    startedAt: new Date().toISOString(),
    ...extra
  };
}
