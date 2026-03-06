self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Verifica se a requisição é um POST e para a URL de compartilhamento
  if (event.request.method !== 'POST' || !url.pathname.includes('AnexoCompartilhado')) {
    return;
  }
  
  // Responde ao evento de fetch com a lógica de compartilhamento
  event.respondWith(handleShare(event.request));
});

async function handleShare(request) {
  const formData = await request.formData();
  const file = formData.get('comprovante'); // 'comprovante' é o nome definido em manifest.json

  if (file instanceof File) {
    // Converte o arquivo para Base64
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    const payload = JSON.stringify({ base64: btoa(bin), name: file.name, type: file.type, size: file.size });
    
    // Salva o payload no Cache Storage para a página React poder acessá-lo
    const cache = await caches.open('share-target-data');
    await cache.put('/_shared_file_payload', new Response(payload, { headers: { 'Content-Type': 'application/json' } }));
  }
  
  // Redireciona para a página AnexoCompartilhado
  return Response.redirect('/AnexoCompartilhado', 303);
}
