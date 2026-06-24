import { allowProgrammaticFocusBriefly, focusField } from '@/lib/focusPolicy';

let globalSearchInputEl = null;

/** Regista o input da busca global (montado no mobile mesmo com overlay fechado). */
export function registerGlobalSearchInput(el) {
  globalSearchInputEl = el;
}

function focusGlobalSearchInput() {
  if (!globalSearchInputEl) return;
  allowProgrammaticFocusBriefly(400);
  focusField(globalSearchInputEl, { preventScroll: true });
}

/** Abre o diálogo de busca global (lupa mobile ou Ctrl/Cmd+K e / no desktop). */
export function openGlobalSearch(initialQuery = '') {
  focusGlobalSearchInput();
  window.dispatchEvent(
    new CustomEvent('open-global-search', { detail: { query: initialQuery } })
  );
}
