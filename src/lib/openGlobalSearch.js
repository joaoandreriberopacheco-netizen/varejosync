/** Abre o diálogo de busca global (mesmo fluxo da lupa no bottom nav mobile). */
export function openGlobalSearch(initialQuery = '') {
  window.dispatchEvent(
    new CustomEvent('open-global-search', { detail: { query: initialQuery } })
  );
}
