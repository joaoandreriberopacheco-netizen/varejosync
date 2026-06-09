const STORAGE_KEY = 'p38_contagem_express_draft_v1';

export function loadContagemExpressDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessionId: null, conferenciaId: null, itens: [], updatedAt: null };
    const parsed = JSON.parse(raw);
    return {
      sessionId: parsed.sessionId || null,
      conferenciaId: parsed.conferenciaId || null,
      itens: Array.isArray(parsed.itens) ? parsed.itens : [],
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return { sessionId: null, conferenciaId: null, itens: [], updatedAt: null };
  }
}

export function saveContagemExpressDraft(sessionId, itens, conferenciaId = null) {
  const payload = {
    sessionId,
    conferenciaId,
    itens,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function clearContagemExpressDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createContagemExpressSessionId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `CE-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
