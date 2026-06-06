/** Dispositivo com ponteiro grosso (toque) — teclado virtual não deve abrir sozinho. */
export function isCoarsePointer() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

let programmaticFocusAllowedUntil = 0;

const KEYBOARD_FOCUS_KEYS = new Set([
  'Tab',
  'Enter',
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
]);

/** Permite .focus() programático só após Tab/Enter/setas (próximo campo). */
export function allowProgrammaticFocusBriefly() {
  programmaticFocusAllowedUntil = Date.now() + 80;
}

export function isProgrammaticFocusAllowed() {
  return Date.now() <= programmaticFocusAllowedUntil;
}

export function shouldAllowAutoFocus() {
  return !isCoarsePointer();
}

/** Foco explícito por navegação de teclado (Tab, Enter, setas). */
export function focusFromKeyboard(el, options) {
  if (!el) return;
  allowProgrammaticFocusBriefly();
  el.focus(options);
}

/** Foco programático respeitando política mobile. */
export function focusField(el, options) {
  if (!el) return;
  if (isCoarsePointer() && !isProgrammaticFocusAllowed()) return;
  el.focus(options);
}

/** Bloqueia autoFocus e .focus() espontâneo no mobile; mantém Tab/Enter/setas. */
export function installMobileFocusPolicy() {
  if (!isCoarsePointer()) return;

  document.addEventListener(
    'keydown',
    (e) => {
      if (KEYBOARD_FOCUS_KEYS.has(e.key)) {
        allowProgrammaticFocusBriefly();
      }
    },
    true
  );

  const nativeFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function focusWithPolicy(...args) {
    if (!isProgrammaticFocusAllowed()) return;
    return nativeFocus.apply(this, args);
  };
}
