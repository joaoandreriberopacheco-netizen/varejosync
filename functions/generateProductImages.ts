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

        const prompt = `Você é um assistente especializado em encontrar URLs de imagens de produtos na internet.
Receba um nome e marca de produto e retorne URLs de imagens DIRETA.
Instruções rigorosas:
1.  **Priorize URLs de imagem diretas:** A URL deve terminar em .jpg, .png, .webp, .jpeg, ou ser um CDN de imagem direto. EVITE links para páginas HTML.
2.  **Imagens públicas e acessíveis:** As imagens devem ser visíveis publicamente sem necessidade de login.
3.  **Foco em sites de varejo/catálogo:** Busque em sites de e-commerce, catálogos de fabricantes, ou repositórios de imagens (como Wikimedia Commons, Unsplash, Pexels). EVITE sites que bloqueiam hotlinking (alguns grandes marketplaces podem fazer isso).
4.  **Flexibilidade para genéricos:** Se não encontrar uma imagem exata para o produto com a marca especificada, encontre uma imagem *genérica de alta qualidade* que represente o tipo de produto (ex: "lata de tinta branca" se o produto for uma tinta).
5.  **Quantidade:** Forneça até 5 URLs de imagens que você considera as mais prováveis de funcionar.

Produto: "${productName}"
Marca: "${productBrand || ''}"

Formato de saída (APENAS JSON):
{
  "image_urls": ["url_imagem_1", "url_imagem_2", "url_imagem_3", "url_imagem_4", "url_imagem_5"]
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
        
        return Response.json({ image_urls: response.image_urls });
    } catch (error) {
        console.error("Error in generateProductImages:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});