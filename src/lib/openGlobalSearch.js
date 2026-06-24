import { primeMobileSearchKeyboard } from '@/lib/focusPolicy';

/** Abre o diálogo de busca global (lupa mobile ou Ctrl/Cmd+K e / no desktop). */
export function openGlobalSearch(initialQuery = '') {
  primeMobileSearchKeyboard();
  window.dispatchEvent(
    new CustomEvent('open-global-search', { detail: { query: initialQuery } })
  );
}
