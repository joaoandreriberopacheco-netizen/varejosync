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
    console.log('SW: Interceptou POST para /AnexoCompartilhado');
    
    // O redirecionamento 303 indica que a resposta à solicitação POST pode ser encontrada sob outro URI
    // e que o user agent DEVE recuperar o recurso usando um método GET.
    // Isso é crucial para que a página de destino possa ser carregada.
    event.respondWith(Response.redirect('/AnexoCompartilhado?share-target=true', 303));

    event.waitUntil((async () => {
      try {
        const formData = await event.request.formData();
        const files = formData.getAll('files');
        const text = formData.get('text'); // Adiciona captura de texto/URL
        const title = formData.get('title'); // Adiciona captura de título

        console.log('SW: Dados recebidos via formData:', { files: files.length, text, title });

        const cache = await caches.open('VarejoSync-shared-files');
        const fileEntries = [];

        for (const file of files) {
          if (file instanceof File) {
            const fileUrl = `/shared-file-${Date.now()}-${file.name}`;
            await cache.put(fileUrl, new Response(file, { headers: { 'Content-Type': file.type } }));
            fileEntries.push({ name: file.name, type: file.type, size: file.size, url: fileUrl });
            console.log('SW: Arquivo salvo no cache:', fileUrl);
          }
        }
        
        // Adiciona entradas para texto/URL se existirem
        if (text) {
          fileEntries.push({ name: title || 'Texto Compartilhado', type: 'text/plain', url: '', textContent: text });
          console.log('SW: Texto/URL recebido:', text);
        }

        // Aguarda a página abrir e envia postMessage
        const sendMessage = async (retries = 15) => { // Aumenta retries
          const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          const targetClient = allClients.find(c => c.url.includes('/AnexoCompartilhado'));
          
          if (targetClient) {
            targetClient.postMessage({ type: 'SHARED_FILES', files: fileEntries });
            console.log('SW: Mensagem postada para a página AnexoCompartilhado.');
          } else if (retries > 0) {
            console.log(`SW: Página não encontrada, tentando novamente em 500ms. Tentativas restantes: ${retries - 1}`);
            await new Promise(r => setTimeout(r, 500)); // Aumenta o timeout
            await sendMessage(retries - 1);
          } else {
            console.error('SW: Não foi possível encontrar a página AnexoCompartilhado para postMessage após várias tentativas.');
          }
        };

        await sendMessage();
      } catch (error) {
        console.error('SW: Erro no evento fetch do Share Target:', error);
      }
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
  console.log('SW: Mensagem recebida de cliente:', event.data);
});

// Adiciona um listener para a instalação para logar
self.addEventListener('install', (event) => {
  console.log('SW: Instalado!');
  event.waitUntil(self.skipWaiting());
});

// Adiciona um listener para a ativação para logar
self.addEventListener('activate', (event) => {
  console.log('SW: Ativado!');
  event.waitUntil(self.clients.claim());
});
