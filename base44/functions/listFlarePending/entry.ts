import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Lista TargetFlare pendentes para consumo por ferramentas (export / Cursor).
 * Apenas administradores. Usa o contexto do pedido autenticado (sem token no cliente além da sessão).
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Use POST' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const rows = await base44.entities.TargetFlare.filter({ status: 'pending' }, '-created_date', 500);
    const items = Array.isArray(rows) ? rows : [];

    return Response.json({
      exportedAt: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
