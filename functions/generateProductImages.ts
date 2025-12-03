import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { productName, productBrand } = await req.json();

        if (!productName) {
            return Response.json({ error: 'productName is required' }, { status: 400 });
        }

        console.log(`Generating images for: ${productName}`);

        // 1. TENTATIVA 1: Busca na Web por URLs estáveis (Wikimedia, etc)
        let urls = [];
        
        try {
            const prompt = `Encontre URLs diretas de imagens REAIS e PÚBLICAS para o produto: "${productName}" ${productBrand ? `Marca: ${productBrand}` : ''}.
            
            Priorize:
            1. Wikimedia Commons (URLs terminadas em .jpg/.png)
            2. Lojas de construção grandes (Leroy, Telhanorte) - URLs de CDN
            3. Imagens genéricas se for material básico (Areia, Brita, Tijolo)
            
            IMPORTANTE: Teste mentalmente se a URL parece permanente.
            
            Retorne APENAS JSON: { "image_urls": ["url1", "url2"] }`;

            const searchResponse = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        image_urls: { type: "array", items: { type: "string" } }
                    }
                }
            });

            if (searchResponse.image_urls && Array.isArray(searchResponse.image_urls)) {
                // Filtra URLs vazias ou que parecem placeholder
                urls = searchResponse.image_urls.filter(u => u && u.length > 10 && u.startsWith('http'));
            }
        } catch (e) {
            console.error("Erro na busca LLM:", e);
        }

        // 2. TENTATIVA 2 (FALLBACK INFALÍVEL): Gerar Imagem com IA
        // Se não encontrou nada (ou trouxe pouco), gera uma imagem nova
        if (urls.length === 0) {
            console.log("Nenhuma URL encontrada na busca. Gerando imagem com IA...");
            try {
                const genPrompt = `Professional product photography of construction material: ${productName} ${productBrand || ''}. Isolated on white background, studio lighting, photorealistic, 8k uhd, high quality commercial catalog image.`;
                
                const genResponse = await base44.integrations.Core.GenerateImage({
                    prompt: genPrompt
                });

                if (genResponse && genResponse.url) {
                    urls.push(genResponse.url);
                }
            } catch (genError) {
                console.error("Erro na geração de imagem IA:", genError);
            }
        }

        // Retorna o que tiver (Busca ou Geração)
        return Response.json({ image_urls: urls });

    } catch (error) {
        console.error("Fatal error in generateProductImages:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});