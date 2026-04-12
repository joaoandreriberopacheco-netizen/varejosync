const CACHE_NAME = 'p38-erp-v2';
const SHARED_CACHE = 'VarejoSync-shared-files';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== SHARED_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

/**
 * Web Share Target (PWA): POST com multipart → grava arquivo no cache e redireciona para AnexoCompartilhado.
 */
async function handleShareTargetPost(request) {
  const url = new URL(request.url);
  const formData = await request.formData();
  const title = (formData.get('title') && String(formData.get('title'))) || '';
  const text = (formData.get('text') && String(formData.get('text'))) || '';
  const urlParam = (formData.get('url') && String(formData.get('url'))) || '';

  const cache = await caches.open(SHARED_CACHE);
  const fileEntries = formData.getAll('files');

  for (const file of fileEntries) {
    if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
      const cacheUrl = `${self.location.origin}/shared/${Date.now()}-${encodeURIComponent(file.name || 'arquivo')}`;
      await cache.put(cacheUrl, new Response(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } }));
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach((c) =>
        c.postMessage({
          type: 'SHARED_FILES',
          files: [{ url: cacheUrl, name: file.name, textContent: null }],
        })
      );
    }
  }

  const redirectParams = new URLSearchParams();
  if (title) redirectParams.set('title', title);
  if (text) redirectParams.set('text', text);
  if (urlParam) redirectParams.set('url', urlParam);
  redirectParams.set('share-target', '1');

  const dest = `${self.location.origin}${url.pathname}?${redirectParams.toString()}`;
  return Response.redirect(dest, 303);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/AnexoCompartilhado') {
    event.respondWith(
      handleShareTargetPost(event.request).catch(() =>
        Response.redirect(`${self.location.origin}/AnexoCompartilhado?share-error=1`, 303)
      )
    );
    return;
  }

  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
