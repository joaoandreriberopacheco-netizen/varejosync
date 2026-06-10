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

const CODIGO_SESSAO_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Código aleatório de 6 caracteres alfanuméricos (A–Z, 0–9). */
export function createContagemExpressSessionId() {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += CODIGO_SESSAO_CHARS[Math.floor(Math.random() * CODIGO_SESSAO_CHARS.length)];
  }
  return code;
}
