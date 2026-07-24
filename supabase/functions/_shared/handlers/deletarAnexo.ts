// Port Supabase Storage — base44/functions/deletarAnexo
import type { createP38Client } from '../p38Client.ts';
import { serviceClient } from '../auth.ts';

const bucket = () => Deno.env.get('SUPABASE_ANEXOS_BUCKET') || 'anexos';

function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${bucket()}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { anexo_id } = await req.json();
  if (!anexo_id) return Response.json({ error: 'anexo_id obrigatório' }, { status: 400 });

  const anexo = await base44.asServiceRole.entities.AnexoDocumento.get(anexo_id);
  if (!anexo) return Response.json({ error: 'Anexo não encontrado' }, { status: 404 });

  const url = String(anexo.url_drive || '');
  const path = storagePathFromUrl(url);
  if (path) {
    const client = serviceClient();
    await client.storage.from(bucket()).remove([path]);
  }

  await base44.asServiceRole.entities.AnexoDocumento.delete(anexo_id);

  if (anexo.referencia_tipo === 'ContaPrevista' && anexo.referencia_id) {
    const restantes = await base44.asServiceRole.entities.AnexoDocumento.filter({
      referencia_tipo: 'ContaPrevista',
      referencia_id: anexo.referencia_id,
    });
    const patch: Record<string, unknown> = {
      tem_anexo: restantes.length > 0,
      tem_boleto: restantes.some((a) => a.tipo_documento === 'boleto'),
      tem_comprovante: restantes.some((a) => a.tipo_documento === 'comprovante'),
    };
    if (!patch.tem_boleto) patch.boleto_url = null;
    await base44.asServiceRole.entities.ContaPrevista.update(anexo.referencia_id, patch);
  }

  return Response.json({ success: true });
}
