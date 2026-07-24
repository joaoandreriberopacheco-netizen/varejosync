// Port automático de base44/functions/enhanceLogo/entry.ts
import type { createP38Client } from '../p38Client.ts';

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gerar logo aprimorado usando IA
    const prompt = `Professional high-resolution logo for "MANAH" business software system. 
    - Clean, modern design suitable for SaaS/ERP software
    - Text "MANAH" in bold, professional typography (sans-serif, modern)
    - Small green leaf icon above or integrated with the letter "A" as a subtle brand element
    - Minimalist style with excellent contrast and readability
    - Transparent or white background
    - Optimized for web display at various sizes (from favicon to hero)
    - Color palette: dark gray/black text (#1f2937) with a single green accent (#10b981) for the leaf
    - Professional, trustworthy, and clean aesthetic
    - High contrast and sharp edges for crisp display on screens
    - Suitable for both light and dark mode interfaces`;

    const { url } = await base44.integrations.Core.GenerateImage({ 
      prompt 
    });

    return Response.json({ 
      success: true, 
      logo_url: url,
      message: 'Logo aprimorado gerado com sucesso'
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
