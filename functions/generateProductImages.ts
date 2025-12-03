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

        // Prompt otimizado para "fallback" inteligente e fontes de construção
        const prompt = `Você é um especialista em catalogação de produtos de material de construção.
        
        OBJETIVO: Encontrar URLs de imagens válidas para o produto: "${productName}" ${productBrand ? `Marca: ${productBrand}` : ''}.

        ESTRATÉGIA DE BUSCA (Siga em ordem):
        1.  **Busca Exata:** Tente encontrar a imagem oficial do produto da marca específica.
        2.  **Busca Aproximada:** Se não houver imagem exata, busque por produtos equivalentes da mesma marca.
        3.  **FALLBACK OBRIGATÓRIO (Genérico):** Se os passos acima falharem ou retornarem poucos resultados, busque por imagens GENÉRICAS de alta qualidade que representem o produto visualmente (ex: para "Tubo PVC Amanco", se não achar, retorne imagem de "Tubo PVC" genérico; para "Tijolo Baiano", retorne foto de qualquer tijolo baiano).

        FONTES DE IMAGENS:
        - Priorize: Wikimedia Commons, Pixabay, Pexels, Unsplash (busque termos em inglês se necessário, ex: "brick" para tijolo).
        - E-commerces de construção (Leroy Merlin, Telhanorte, C&C, etc) - tente extrair a URL da imagem principal.
        
        REQUISITOS TÉCNICOS DAS URLS:
        - Devem ser links diretos para a imagem (preferencialmente terminando em .jpg, .png, .webp).
        - URLs devem ser públicas.
        - Evite URLs longas com tokens de sessão que expiram.

        SAÍDA:
        Retorne uma lista com 8 a 10 URLs para aumentar a chance de sucesso. Misture imagens exatas e genéricas.

        Formato JSON estrito:
        {
          "image_urls": ["url1", "url2", "url3", ...]
        }
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    image_urls: {
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["image_urls"]
            }
        });
        
        return Response.json({ image_urls: response.image_urls || [] });
    } catch (error) {
        console.error("Error in generateProductImages:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});