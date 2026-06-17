/** Alvo de teclado onde atalhos globais não devem disparar (exceto Ctrl/Cmd+K). */
export function isTypingTarget(target) {
  if (!target || typeof Element === 'undefined' || !(target instanceof Element)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

/** Rótulo do atalho para exibir na UI (⌘K no Mac, Ctrl+K nos demais). */
export function getGlobalSearchShortcutLabel() {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform)) {
    return '⌘K';
  }
  return 'Ctrl+K';
}

/**
 * True quando o evento deve abrir a busca global de funções.
 * Ctrl/Cmd+K funciona em qualquer contexto; "/" só fora de campos de texto.
 */
export function shouldOpenGlobalSearchFromKeyboard(event) {
  const key = event.key?.toLowerCase?.() ?? '';

  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && key === 'k') {
    return true;
  }

  if (key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    return !isTypingTarget(event.target);
  }

  return false;
}
