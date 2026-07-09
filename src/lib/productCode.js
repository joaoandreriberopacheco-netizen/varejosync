const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const RAW_CODE_LENGTH = 6;

function randomChar() {
  const idx = Math.floor(Math.random() * CODE_ALPHABET.length);
  return CODE_ALPHABET[idx];
}

export function normalizeProductCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, RAW_CODE_LENGTH);
}

export function formatProductCode(value) {
  const raw = normalizeProductCode(value);
  if (!raw) return '';
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

export function normalizeProductCodeForSearch(value) {
  return normalizeProductCode(value);
}

export function productCodesMatch(a, b) {
  const left = normalizeProductCodeForSearch(a);
  const right = normalizeProductCodeForSearch(b);
  if (!left || !right) return false;
  return left === right;
}

export function isCanonicalProductCode(value) {
  return /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(String(value || '').toUpperCase());
}

export function generateRandomProductCode(existingCodes = []) {
  const existingList = Array.isArray(existingCodes) ? existingCodes : Array.from(existingCodes || []);
  const taken = new Set(
    existingList
      .map((code) => normalizeProductCodeForSearch(code))
      .filter(Boolean),
  );

  for (let i = 0; i < 20000; i += 1) {
    let raw = '';
    for (let k = 0; k < RAW_CODE_LENGTH; k += 1) raw += randomChar();
    // Garante código alfanumérico (com pelo menos 1 letra e 1 número).
    if (!/[A-Z]/.test(raw) || !/\d/.test(raw)) continue;
    if (taken.has(raw)) continue;
    return formatProductCode(raw);
  }

  throw new Error('Não foi possível gerar código alfanumérico único para produto.');
}
