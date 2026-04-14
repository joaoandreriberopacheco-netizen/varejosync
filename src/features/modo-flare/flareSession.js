const STORAGE_KEY = 'p38_flare_unlocked';
const TTL_MS = 8 * 60 * 60 * 1000;

function readRecord() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isFlareUnlocked() {
  const rec = readRecord();
  if (!rec || typeof rec.t !== 'number') return false;
  return Date.now() - rec.t < TTL_MS;
}

export function setFlareUnlocked() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ t: Date.now() }));
}

export function clearFlareUnlock() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getExpectedFlarePin() {
  return import.meta.env.VITE_FLARE_PIN ?? '240793';
}

export function validateFlarePin(input) {
  const pin = String(input ?? '').trim();
  return pin === getExpectedFlarePin();
}
