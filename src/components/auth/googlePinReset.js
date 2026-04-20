/**
 * Google Identity Services — carregamento e detecção de configuração para redefinição de PIN.
 */

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

/** Último handler ativo (evita chamar initialize mais de uma vez). */
export const googlePinCredentialBridge = {
  _handler: null,
  set(handler) {
    this._handler = handler;
  },
  clear() {
    this._handler = null;
  },
  emit(credential) {
    this._handler?.(credential);
  },
};

let gsiInitializedForClient = null;

export function isGooglePinResetConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}

export function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Ambiente sem window'));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Google Sign-In')));
      return;
    }
    const s = document.createElement('script');
    s.src = GSI_SCRIPT;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar Google Sign-In'));
    document.head.appendChild(s);
  });
}

/**
 * Garante `initialize` uma vez por clientId; credenciais são repassadas ao bridge.
 */
export async function ensureGooglePinGsiInitialized(clientId) {
  await loadGoogleIdentityScript();
  if (gsiInitializedForClient === clientId) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      googlePinCredentialBridge.emit(response?.credential);
    },
    auto_select: false,
  });
  gsiInitializedForClient = clientId;
}
