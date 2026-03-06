self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/AnexoCompartilhado') {
    
    // 1. Interceptamos a requisição e seguramos a resposta
    event.respondWith((async () => {
      try {
        // IMPORTANTE: Ler o formData ANTES de responder
        const formData = await event.request.formData();
        const files = formData.getAll('files');
        const text = formData.get('description'); // De acordo com teu manifest
        const title = formData.get('name');      // De acordo com teu manifest

        const cache = await caches.open('VarejoSync-shared-files');
        const fileEntries = [];

        for (const file of files) {
          if (file instanceof File) {
            const fileUrl = `/shared-file-${Date.now()}-${file.name}`;
            await cache.put(fileUrl, new Response(file, { 
              headers: { 'Content-Type': file.type } 
            }));
            fileEntries.push({ name: file.name, type: file.type, size: file.size, url: fileUrl });
          }
        }

        if (text) {
          fileEntries.push({ name: title || 'Texto', type: 'text/plain', textContent: text });
        }

        // 2. Agora que os dados estão salvos no Cache, redirecionamos
        // O cliente será enviado para a página que vai processar os ficheiros
        setTimeout(() => {
            enviarMensagemParaPagina(fileEntries);
        }, 1000); // Pequeno delay para a página carregar

        return Response.redirect('/AnexoCompartilhado?share-target=true', 303);
      } catch (err) {
        console.error('Erro ao processar partilha:', err);
        return Response.redirect('/error', 303);
      }
    })());
    return;
  }

  // Cache-first padrão para o resto
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});

// Função auxiliar para comunicar com a janela aberta
async function enviarMensagemParaPagina(fileEntries, retries = 10) {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const targetClient = allClients.find(c => c.url.includes('/AnexoCompartilhado'));

  if (targetClient && targetClient.visibilityState === 'visible') {
    targetClient.postMessage({ type: 'SHARED_FILES', files: fileEntries });
  } else if (retries > 0) {
    setTimeout(() => enviarMensagemParaPagina(fileEntries, retries - 1), 500);
  }
}
