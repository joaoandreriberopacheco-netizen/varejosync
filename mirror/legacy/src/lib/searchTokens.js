/** Espaço e ";" separam termos com o mesmo efeito (espaço é mais prático no mobile). */
export const SEARCH_TERM_SEPARATOR_RE = /[;\s]+/;

export function parseSearchTerms(rawTerm, normalize = (value) => String(value || '').trim().toLowerCase()) {
  return String(rawTerm || '')
    .split(SEARCH_TERM_SEPARATOR_RE)
    .map(normalize)
    .filter(Boolean);
}
