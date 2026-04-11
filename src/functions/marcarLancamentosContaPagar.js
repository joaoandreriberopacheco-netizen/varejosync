import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const lancamentos = await base44.asServiceRole.entities.LancamentoFinanceiro.list('-data_vencimento', 2000);
    const candidatos = (lancamentos || []).filter((item) => {
      if (!item || item.tipo !== 'Despesa') return false;
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const jaMarcado = tags.includes('conta_pagar');
      if (jaMarcado) return false;

      const referenciaCompra = item.referencia_tipo === 'PedidoCompra';
      const recorrente = item.is_recorrente || Boolean(item.frequencia_recorrencia) || Boolean(item.grupo_lancamento_id);
      const aberto = item.status === 'Em Aberto' || item.status === 'Vencido' || item.status === 'Pago';

      return referenciaCompra || recorrente || aberto;
    });

    let atualizados = 0;

    for (const item of candidatos) {
      const tagsAtuais = Array.isArray(item.tags) ? item.tags : [];
      const novasTags = Array.from(new Set([
        ...tagsAtuais,
        'conta_pagar',
        ...(item.is_recorrente || item.frequencia_recorrencia || item.grupo_lancamento_id ? ['recorrente'] : []),
      ]));

      await base44.asServiceRole.entities.LancamentoFinanceiro.update(item.id, { tags: novasTags });
      atualizados += 1;
    }

    return Response.json({ success: true, atualizados, total_analisados: lancamentos?.length || 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});