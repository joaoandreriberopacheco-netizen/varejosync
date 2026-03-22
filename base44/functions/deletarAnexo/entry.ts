import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { anexo_id, drive_file_id } = await req.json();
    if (!anexo_id) return Response.json({ error: 'anexo_id obrigatório' }, { status: 400 });

    // Deletar no Drive se tiver o ID
    if (drive_file_id) {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
      await fetch(`https://www.googleapis.com/drive/v3/files/${drive_file_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    // Deletar na base
    await base44.asServiceRole.entities.AnexoDocumento.delete(anexo_id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});