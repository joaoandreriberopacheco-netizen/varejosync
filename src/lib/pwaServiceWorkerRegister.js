import { shouldRegisterServiceWorker } from '@/lib/pwaServiceWorkerEnv';

/** Regista /sw.js o mais cedo possível (share target Android envia POST antes do load). */
export function registerServiceWorkerIfNeeded() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!shouldRegisterServiceWorker()) return;

  navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then((registration) => {
      registration.update();
      console.log('[PWA] Service worker registado:', registration.scope);
    })
    .catch((err) => {
      console.warn('[PWA] Falha ao registar service worker:', err);
    });
}
