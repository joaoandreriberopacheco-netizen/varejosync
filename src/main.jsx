import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@/index.css'
import { normalizeDataText } from '@/lib/normalizeDataText'

// Tema antes da primeira pintura (splash, login, etc.)
try {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark')
  }
} catch (_) {
  /* ignore */
}

// Select-on-focus global: seleciona o texto ao clicar/focar em qualquer input numérico ou de texto
document.addEventListener('focusin', (e) => {
  const el = e.target;
  if (
    el.tagName === 'INPUT' &&
    ['text', 'number', 'tel', 'email', 'search', 'password', 'date', ''].includes(el.type)
  ) {
    setTimeout(() => el.select(), 0);
  }
});

const UPPERCASE_SKIP_TYPES = new Set([
  'password', 'number', 'date', 'time', 'datetime-local', 'month', 'week',
  'file', 'hidden', 'checkbox', 'radio', 'range', 'color',
]);

function normalizeInputElement(el) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  if (el.closest('[data-preserve-case="true"]')) return;
  if (el instanceof HTMLInputElement && UPPERCASE_SKIP_TYPES.has(el.type)) return;

  const upper = normalizeDataText(el.value);
  if (el.value === upper) return;

  const { selectionStart, selectionEnd } = el;
  el.value = upper;
  if (selectionStart != null && selectionEnd != null) {
    el.setSelectionRange(selectionStart, selectionEnd);
  }
}

// Maiúsculas na digitação — grava o valor já em maiúsculas (exceto tipos sensíveis)
document.addEventListener('input', (e) => normalizeInputElement(e.target));
document.addEventListener('blur', (e) => normalizeInputElement(e.target), true);

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

/** Remover após executar `await window.__retificarEmbarque5r8b3()` uma vez com sessão Base44 (stock 5R8B3-A). */
if (import.meta.env.DEV) {
  import('@/api/base44Client').then(({ base44 }) =>
    import('@/lib/oneOffRetificarEmbarque5r8b3.js').then((m) => {
      window.__retificarEmbarque5r8b3 = () => m.retificarEmbarque5r8b3UmaVez(base44);
    })
  );
}

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}
