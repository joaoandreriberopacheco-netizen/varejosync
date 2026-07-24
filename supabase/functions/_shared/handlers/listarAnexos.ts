// Port automático de base44/functions/listarAnexos/entry.ts
import type { createP38Client } from '../p38Client.ts';

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
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
}
