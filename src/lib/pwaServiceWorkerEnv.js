/** Hostname(s) do P38 em produção no Base44 — Web Share Target exige service worker activo. */
export const P38_PRODUCTION_HOSTS = ['p38.base44.app'];

/**
 * Registar SW em produção (Vercel, p38.base44.app, domínio próprio).
 * Omitir em Vite dev e no preview Base44 (cache de /src/*.jsx quebra HMR).
 */
export function shouldRegisterServiceWorker(locationLike = typeof window !== 'undefined' ? window.location : null) {
  if (!locationLike) return false;

  const host = locationLike.hostname || '';
  const port = locationLike.port || '';

  if (host === 'localhost' || host === '127.0.0.1' || port === '5173') {
    return false;
  }

  const onBase44 = host === 'base44.app' || host.endsWith('.base44.app');
  if (onBase44 && !P38_PRODUCTION_HOSTS.includes(host)) {
    return false;
  }

  return true;
}
