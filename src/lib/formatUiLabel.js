/** Rótulos visíveis na UI — sempre maiúsculas (pt-BR). */
export function formatUiLabel(value) {
  if (value == null || value === '') return value;
  return String(value).toLocaleUpperCase('pt-BR');
}
