import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

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