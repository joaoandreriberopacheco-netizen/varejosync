const STORAGE_KEY = 'p38_financeiro_webauthn_v1';
const RP_NAME = 'P38 ERP';

function getRpId() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'localhost';
  return host;
}

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(base64url) {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function isWebAuthnSupported() {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && typeof window.PublicKeyCredential === 'function';
}

export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasFinanceiroBiometricEnrollment() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return typeof parsed?.id === 'string' && parsed.id.length > 0;
  } catch {
    return false;
  }
}

export function clearFinanceiroBiometricEnrollment() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

export async function registerFinanceiroBiometric() {
  if (!isWebAuthnSupported()) {
    throw new Error('Biometria não suportada neste navegador.');
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME, id: getRpId() },
      user: {
        id: Uint8Array.from('p38-financeiro-gate', (c) => c.charCodeAt(0)),
        name: 'financeiro-gate',
        displayName: 'Financeiro P38',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60_000,
    },
  });

  if (!credential?.rawId) {
    throw new Error('Não foi possível registrar a biometria.');
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: bufferToBase64url(credential.rawId), rpId: getRpId() }),
  );
  return true;
}

export async function authenticateFinanceiroBiometric() {
  if (!isWebAuthnSupported() || !hasFinanceiroBiometricEnrollment()) {
    return false;
  }

  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }

  if (!stored?.id) return false;

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: stored.rpId || getRpId(),
        allowCredentials: [{
          id: base64urlToBuffer(stored.id),
          type: 'public-key',
        }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}
