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

    const anexo = await base44.asServiceRole.entities.AnexoDocumento.get(anexo_id);

    // Deletar na base
    await base44.asServiceRole.entities.AnexoDocumento.delete(anexo_id);

    if (anexo?.referencia_tipo === 'ContaPrevista' && anexo?.referencia_id) {
      const conta = await base44.asServiceRole.entities.ContaPrevista.get(anexo.referencia_id);
      const anexosRestantes = await base44.asServiceRole.entities.AnexoDocumento.filter({
        referencia_tipo: 'ContaPrevista',
        referencia_id: anexo.referencia_id,
      });
      const temAnexo = anexosRestantes.length > 0;
      const temBoleto = anexosRestantes.some((item) => item.tipo_documento === 'Boleto');
      const temComprovante = anexosRestantes.some((item) => item.tipo_documento === 'Comprovante');
      const boleto = anexosRestantes.find((item) => item.tipo_documento === 'Boleto');
      const hoje = new Date().toISOString().slice(0, 10);
      const vencida = conta?.data_vencimento && conta.data_vencimento < hoje && conta.status !== 'Pago';

      await base44.asServiceRole.entities.ContaPrevista.update(anexo.referencia_id, {
        tem_anexo: temAnexo,
        tem_boleto: temBoleto,
        tem_comprovante: temComprovante,
        boleto_url: boleto?.url_drive || '',
        status: conta?.status === 'Pago' ? 'Pago' : temBoleto ? 'Boleto Anexado' : 'Pendente',
        status_visual: conta?.status === 'Pago' ? 'pago' : temBoleto ? (vencida ? 'vencido' : 'boleto_anexado') : 'pendente',
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});