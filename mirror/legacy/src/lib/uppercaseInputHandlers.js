import { normalizeDataText } from '@/lib/normalizeDataText';

export const UPPERCASE_SKIP_INPUT_TYPES = new Set([
  'password',
  'number',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
  'file',
  'hidden',
  'checkbox',
  'radio',
  'range',
  'color',
]);

export function shouldUppercaseInputElement(el) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
  if (el.closest('[data-preserve-case="true"]')) return false;
  if (el instanceof HTMLInputElement && UPPERCASE_SKIP_INPUT_TYPES.has(el.type)) return false;
  return true;
}

export function uppercaseInputValue(el) {
  if (!shouldUppercaseInputElement(el)) return false;

  const upper = normalizeDataText(el.value);
  if (el.value === upper) return false;

  const { selectionStart, selectionEnd } = el;
  el.value = upper;

  if (selectionStart != null && selectionEnd != null) {
    try {
      el.setSelectionRange(selectionStart, selectionEnd);
    } catch {
      /* ignore for types that don't support selection */
    }
  }

  return true;
}

export function createUppercaseInputChangeHandler(onChange) {
  return (event) => {
    uppercaseInputValue(event.target);
    onChange?.(event);
  };
}
