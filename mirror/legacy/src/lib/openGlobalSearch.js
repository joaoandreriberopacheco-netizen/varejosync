import {
  allowProgrammaticFocusBriefly,
  focusField,
} from '@/lib/focusPolicy';

let globalSearchInputEl = null;
let suppressBackdropCloseUntil = 0;
let openSearchOverlaySync = null;

/** Regista o input da busca global (montado no mobile mesmo com overlay fechado). */
export function registerGlobalSearchInput(el) {
  globalSearchInputEl = el;
}

/** Layout regista abertura síncrona (flushSync) para o input estar visível antes do foco. */
export function registerOpenSearchOverlaySync(fn) {
  openSearchOverlaySync = fn;
}

function focusGlobalSearchInput() {
  const el = globalSearchInputEl;
  if (!el) return;
  allowProgrammaticFocusBriefly(500);
  focusField(el, { preventScroll: true });
}

/** Evita fechar o overlay no mesmo toque que abriu (ghost click no mobile). */
export function shouldSuppressGlobalSearchBackdropClose() {
  return Date.now() < suppressBackdropCloseUntil;
}

export function armGlobalSearchOpenGuard() {
  suppressBackdropCloseUntil = Date.now() + 500;
}

/** Abre o diálogo de busca global (lupa mobile ou Ctrl/Cmd+K e / no desktop). */
export function openGlobalSearch(initialQuery = '') {
  armGlobalSearchOpenGuard();

  if (openSearchOverlaySync) {
    openSearchOverlaySync();
  } else {
    window.dispatchEvent(
      new CustomEvent('open-global-search', { detail: { query: initialQuery } })
    );
  }

  focusGlobalSearchInput();
}
