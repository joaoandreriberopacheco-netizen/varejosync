import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const lancamentos = await base44.asServiceRole.entities.LancamentoFinanceiro.list('-data_vencimento', 2000);
    let atualizados = 0;

    for (const item of lancamentos || []) {
      if (!item || item.status === 'Cancelado' || item.tipo === 'Transferência') continue;
      if (item.status === 'Pago') continue;

      const tagsAtuais = Array.isArray(item.tags) ? item.tags : [];
      const novasTags = Array.from(new Set([
        ...tagsAtuais,
        'conta_pagar',
        ...(item.is_recorrente || item.frequencia_recorrencia || item.grupo_lancamento_id ? ['recorrente'] : []),
      ]));

      await base44.asServiceRole.entities.LancamentoFinanceiro.update(item.id, { tags: novasTags });
      atualizados += 1;
    }

    return Response.json({ success: true, atualizados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});