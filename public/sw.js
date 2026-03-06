self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativado');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições de compartilhamento via POST para evitar cache indesejado
  if (event.request.method === 'POST' && event.request.url.includes('/AnexoCompartilhado')) {
    // Estas requisições são tratadas pelo 'fetch' event listener abaixo (share target)
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_NEW_ROUTE') {
    event.waitUntil(
      caches.open('VarejoSync-cache').then((cache) => {
        return cache.add(event.data.url);
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Manipula requisições de compartilhamento via Web Share Target API
  if (event.request.method === 'POST' && url.pathname === '/AnexoCompartilhado') {
    event.respondWith(Response.redirect(url.pathname + '?share-target=true', 303));
    event.waitUntil(async function () {
      const client = await self.clients.get(event.resultingClientId);
      const data = await event.request.formData();
      const files = data.getAll('files'); // 'files' é o nome do campo no manifest.json

      if (files && files.length > 0) {
        // Armazena os arquivos em cache para a página acessar
        const cache = await caches.open('VarejoSync-shared-files');
        const fileEntries = [];

        for (const file of files) {
          const fileUrl = `/shared-file-${Date.now()}-${file.name}`;
          await cache.put(fileUrl, new Response(file));
          fileEntries.push({
            name: file.name,
            type: file.type,
            size: file.size,
            url: fileUrl, // URL temporária no cache
          });
        }
        
        // Envia uma mensagem para a página que está no foco
        if (client) {
            client.postMessage({ type: 'SHARED_FILES', files: fileEntries });
        }
      }
    }());
  }
});
