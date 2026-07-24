// Port Supabase Storage (substitui Google Drive) — base44/functions/uploadAnexoDrive
import type { createP38Client } from '../p38Client.ts';
import { serviceClient } from '../auth.ts';

const bucket = () => Deno.env.get('SUPABASE_ANEXOS_BUCKET') || 'anexos';

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    file_base64,
    file_name = 'anexo',
    file_type = 'application/octet-stream',
    referencia_tipo,
    referencia_id,
    referencia_numero,
    descricao,
    tipo_documento,
  } = body;

  if (!file_base64 || !referencia_tipo || !referencia_id) {
    return Response.json({ error: 'file_base64, referencia_tipo e referencia_id são obrigatórios' }, { status: 400 });
  }

  const bytes = Uint8Array.from(atob(file_base64), (c) => c.charCodeAt(0));
  const safeName = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${referencia_tipo}/${referencia_id}/${crypto.randomUUID()}_${safeName}`;

  const client = serviceClient();
  const { error: upErr } = await client.storage.from(bucket()).upload(path, bytes, {
    contentType: file_type,
    upsert: false,
  });
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = client.storage.from(bucket()).getPublicUrl(path);
  const url = pub.publicUrl;

  const anexo = await base44.asServiceRole.entities.AnexoDocumento.create({
    descricao: descricao || safeName,
    mime_type: file_type,
    nome_arquivo: safeName,
    origem: 'supabase_storage',
    referencia_id,
    referencia_numero,
    referencia_tipo,
    tipo_documento: tipo_documento || 'outro',
    url_drive: url,
    tamanho_bytes: bytes.length,
  });

  if (referencia_tipo === 'ContaPrevista') {
    const flags: Record<string, unknown> = { tem_anexo: true };
    if (tipo_documento === 'boleto') {
      flags.tem_boleto = true;
      flags.boleto_url = url;
    }
    if (tipo_documento === 'comprovante') flags.tem_comprovante = true;
    await base44.asServiceRole.entities.ContaPrevista.update(referencia_id, flags);
  }

  return Response.json({ success: true, anexo });
}
