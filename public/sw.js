const CACHE_NAME = 'p38-erp-v5';
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
    ).then(() => self.clients.claim())
  );
});

function isShareTargetPostUrl(url) {
  const p = url.pathname || '';
  return (
    (p === '/AnexoCompartilhado' || p.endsWith('/AnexoCompartilhado')) &&
    url.origin === self.location.origin
  );
}

/** Chrome/Android podem usar "files", "file" ou outro nome no multipart. */
function collectFilesFromFormData(formData) {
  const out = [];
  const add = (v) => {
    if (v instanceof File && v.size > 0) out.push(v);
  };
  try {
    formData.getAll('files').forEach(add);
  } catch (_) {}
  try {
    formData.getAll('file').forEach(add);
  } catch (_) {}
  if (out.length === 0) {
    try {
      for (const [, val] of formData.entries()) add(val);
    } catch (_) {}
  }
  return out;
}

/**
 * Web Share Target: POST multipart → Cache API (Request explícito) → redirect GET.
 */
async function handleShareTargetPost(request) {
  const url = new URL(request.url);
  const formData = await request.formData();
  const title = (formData.get('title') && String(formData.get('title'))) || '';
  const text = (formData.get('text') && String(formData.get('text'))) || '';
  const urlParam = (formData.get('url') && String(formData.get('url'))) || '';

  const cache = await caches.open(SHARED_CACHE);
  const files = collectFilesFromFormData(formData);

  for (const file of files) {
    const safeName = (file.name || 'arquivo').replace(/[^\w.\-()+ ]/g, '_');
    const cachePath = `/shared/${Date.now()}-${safeName}`;
    const cacheUrl = `${self.location.origin}${cachePath}`;
    const req = new Request(cacheUrl, { method: 'GET' });
    const res = new Response(file, {
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });
    await cache.put(req, res);

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((c) =>
      c.postMessage({
        type: 'SHARED_FILES',
        files: [{ url: cacheUrl, name: file.name || safeName, textContent: null }],
      })
    );
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

  if (event.request.method === 'POST' && isShareTargetPostUrl(url)) {
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
