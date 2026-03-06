// Este é o Service Worker para o seu Progressive Web App (PWA).
// Ele é responsável por interceptar requisições, armazenar em cache recursos
// e gerenciar a funcionalidade de "Web Share Target".

const CACHE_NAME = 'my-pwa-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Adicione outros recursos estáticos que você queira cachear
  // '/manifest.json', // Adicionado no manifest
  // '/logo192.png',   // Adicionado no manifest
];

// Instalação do Service Worker: cacheia os recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Garante que o novo SW seja ativado imediatamente
});

// Ativação do Service Worker: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== 'share-target-data') { // Mantenha o cache do share target
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  console.log('Service Worker activated');
  clients.claim(); // Assume o controle da página imediatamente
});

// Intercepta todas as requisições de rede
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Manipula o Web Share Target
  // Verifica se a requisição é um POST para a URL de compartilhamento
  if (event.request.method === 'POST' && url.pathname === '/AnexoCompartilhado') {
    event.respondWith(handleShare(event.request));
    return;
  }

  // Estratégia Cache-First para recursos estáticos
  // Para outras requisições (não de compartilhamento)
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retorna o recurso do cache se ele existir
      if (response) {
        return response;
      }
      // Caso contrário, busca na rede
      return fetch(event.request).then((networkResponse) => {
        // Se a requisição foi bem sucedida, adiciona ao cache e retorna
        if (networkResponse.ok) {
          return caches.open(CACHE_NAME).then((cache) => {
            // Clona a resposta para que ela possa ser lida e armazenada
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Fallback para quando tanto o cache quanto a rede falham
      // Pode ser uma página offline personalizada
      // return caches.match('/offline.html');
      console.log('Fetch failed, returning offline experience');
      return new Response('<h1>Offline</h1>', {
        headers: { 'Content-Type': 'text/html' }
      });
    })
  );
});

// Função para lidar com o recebimento de arquivos compartilhados
async function handleShare(request) {
  const formData = await request.formData();
  const file = formData.get('comprovante'); // O nome 'comprovante' deve corresponder ao `name` no manifest.json

  if (file instanceof File) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    const payload = JSON.stringify({ 
      base64: btoa(bin), 
      name: file.name, 
      type: file.type, 
      size: file.size 
    });
    
    // Salva o payload do arquivo no Cache Storage
    // Usamos um nome de URL arbitrário para o cache, que a página então buscará
    const cache = await caches.open('share-target-data');
    await cache.put('/_shared_file_payload', new Response(payload, { 
      headers: { 'Content-Type': 'application/json' } 
    }));
  }
  
  // Redireciona o usuário para a página AnexoCompartilhado
  return Response.redirect('/AnexoCompartilhado', 303);
}

// Escuta mensagens do cliente (página principal)
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
