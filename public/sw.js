self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercepta a partilha
  if (event.request.method === 'POST' && url.pathname === '/AnexoCompartilhado') {
    
    event.respondWith((async () => {
      try {
        // 1. LER OS DADOS PRIMEIRO (Isto previne que o ficheiro se perca!)
        const formData = await event.request.formData();
        const files = formData.getAll('files');
        const text = formData.get('description') || formData.get('text'); 
        const title = formData.get('name') || formData.get('title');     

        const cache = await caches.open('VarejoSync-shared-files');
        const fileEntries = [];

        // 2. GUARDAR NO CACHE
        for (const file of files) {
          if (file instanceof File) {
            const fileUrl = `/shared-file-${Date.now()}-${file.name}`;
            await cache.put(fileUrl, new Response(file, { headers: { 'Content-Type': file.type } }));
            fileEntries.push({ name: file.name, type: file.type, size: file.size, url: fileUrl });
          }
        }

        if (text) {
          fileEntries.push({ name: title || 'Texto', type: 'text/plain', textContent: text });
        }

        // 3. AVISAR A PÁGINA COM UM PEQUENO ATRASO
        setTimeout(() => enviarMensagemParaPagina(fileEntries), 1000);

        // 4. SÓ AGORA REDIRECIONAR
        return Response.redirect('/AnexoCompartilhado?share-target=true', 303);
      } catch (err) {
        console.error('SW Erro:', err);
        return Response.redirect('/AnexoCompartilhado?error=true', 303);
      }
    })());
    return;
  }

  event.respondWith(caches.match(event.request).then(res => res || fetch(event.request)));
});

async function enviarMensagemParaPagina(fileEntries, retries = 15) {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const targetClient = allClients.find(c => c.url.includes('/AnexoCompartilhado'));

  if (targetClient) {
    targetClient.postMessage({ type: 'SHARED_FILES', files: fileEntries });
  } else if (retries > 0) {
    setTimeout(() => enviarMensagemParaPagina(fileEntries, retries - 1), 500);
  }
}
