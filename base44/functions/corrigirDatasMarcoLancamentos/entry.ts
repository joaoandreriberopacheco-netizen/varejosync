import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function addOneDay(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const pageSize = 100;
    const payload = await req.json().catch(() => ({}));
    const skip = Number(payload.skip || 0);
    const batchSize = Math.min(Number(payload.batchSize || 20), 20);

    const lote = await base44.asServiceRole.entities.LancamentoFinanceiro.list('-created_date', pageSize, skip);
    const afetados = lote
      .filter((lancamento) => {
        const data = lancamento.data_pagamento;
        return typeof data === 'string' && data >= '2026-03-01' && data <= '2026-03-31';
      })
      .slice(0, batchSize);

    const atualizados = [];

    for (const lancamento of afetados) {
      const novaDataPagamento = addOneDay(lancamento.data_pagamento);
      await base44.asServiceRole.entities.LancamentoFinanceiro.update(lancamento.id, {
        data_pagamento: novaDataPagamento,
      });

      atualizados.push({
        id: lancamento.id,
        descricao: lancamento.descricao,
        anterior: lancamento.data_pagamento,
        nova: novaDataPagamento,
      });
    }

    return Response.json({
      success: true,
      skip,
      batchSize,
      total_encontrados_no_lote: afetados.length,
      total_atualizados: atualizados.length,
      atualizados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});