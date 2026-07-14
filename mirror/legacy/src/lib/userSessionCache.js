/**
 * Cache de sessão para dados do usuário + perfil de acesso.
 * Armazena em memória (módulo singleton) para sobreviver a navegações SPA,
 * e em sessionStorage para sobreviver a reloads.
 * TTL: 10 minutos.
 */

const SESSION_KEY = 'p38_user_session';
const TTL = 10 * 60 * 1000;

let memCache = null;

function readStorage() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > TTL) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeStorage(data) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Falha silenciosa
  }
}

export function getCachedUserSession() {
  if (memCache) return memCache;
  const stored = readStorage();
  if (stored) {
    memCache = stored;
    return stored;
  }
  return null;
}

export function setCachedUserSession(user, perfilDeAcesso) {
  const data = { user, perfilDeAcesso };
  memCache = data;
  writeStorage(data);
}

export function clearUserSessionCache() {
  memCache = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Falha silenciosa
  }
}