import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { referencia_tipo, referencia_id } = body;

    if (!referencia_tipo || !referencia_id) {
      return Response.json({ error: 'referencia_tipo e referencia_id são obrigatórios' }, { status: 400 });
    }

    const anexos = await base44.asServiceRole.entities.AnexoDocumento.filter({
      referencia_tipo,
      referencia_id,
    });

    return Response.json({ anexos });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});