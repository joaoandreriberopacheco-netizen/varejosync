import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const { entityId } = await req.json();

    if (!entityId) {
      return Response.json({ error: 'entityId é obrigatório' }, { status: 400 });
    }

    const result = await base44.asServiceRole.entities[entityId].deleteMany({});

    return Response.json({ success: true, deleted: result.deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});