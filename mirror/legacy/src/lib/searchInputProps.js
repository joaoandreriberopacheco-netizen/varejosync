/**
 * Props para campos de busca no mobile: reduz (não elimina) a barra de
 * autofill/senha/cartão/endereço do teclado. Navegadores podem ignorar.
 */
export const SEARCH_INPUT_PROPS = {
  enterKeyHint: 'search',
  spellCheck: false,
  autoCapitalize: 'characters',
  autoCorrect: 'off',
  name: 'p38-search-q',
  'data-1p-ignore': true,
  'data-lpignore': true,
  'data-form-type': 'other',
};
