self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Web Share Target: intercepta POST para /AnexoCompartilhado
  if (event.request.method === 'POST' && url.pathname === '/AnexoCompartilhado') {
    event.respondWith(Response.redirect('/AnexoCompartilhado?share-target=true', 303));

    event.waitUntil((async () => {
      const data = await event.request.formData();
      const files = data.getAll('files');

      if (!files || files.length === 0) return;

      const cache = await caches.open('VarejoSync-shared-files');
      const fileEntries = [];

      for (const file of files) {
        const fileUrl = `/shared-file-${Date.now()}-${file.name}`;
        await cache.put(fileUrl, new Response(file, { headers: { 'Content-Type': file.type } }));
        fileEntries.push({ name: file.name, type: file.type, size: file.size, url: fileUrl });
      }

      // Aguarda a página abrir e envia postMessage
      const sendMessage = async (retries = 10) => {
        const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const target = allClients.find(c => c.url.includes('/AnexoCompartilhado'));
        if (target) {
          target.postMessage({ type: 'SHARED_FILES', files: fileEntries });
        } else if (retries > 0) {
          await new Promise(r => setTimeout(r, 300));
          await sendMessage(retries - 1);
        }
      };

      await sendMessage();
    })());
    return;
  }

  // Cache-first para demais requisições
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_NEW_ROUTE') {
    event.waitUntil(
      caches.open('VarejoSync-cache').then(cache => cache.add(event.data.url))
    );
  }
});
