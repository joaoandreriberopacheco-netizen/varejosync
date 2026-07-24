// Port automático de base44/functions/repararLancamentosPedidosAprovados/entry.ts
import type { createP38Client } from '../p38Client.ts';

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pedidos = await base44.entities.PedidoCompra.filter({ status: 'Aprovado' });
    const reparados = [];

    for (const pedido of pedidos) {
      const lancamentos = await base44.entities.LancamentoFinanceiro.filter({ referencia_id: pedido.id });
      if (lancamentos.length > 0) continue;

      const contaNome = pedido.conta_pagamento_nome || '';
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Despesa',
        descricao: `Compra - ${pedido.fornecedor_nome || pedido.numero}`,
        terceiro_id: pedido.fornecedor_id,
        terceiro_nome: pedido.fornecedor_nome,
        valor: pedido.valor_total || 0,
        valor_liquido: pedido.valor_total || 0,
        data_vencimento: pedido.data_prevista_entrega || new Date().toISOString().slice(0, 10),
        status: 'Em Aberto',
        status_conciliacao: 'N/A',
        conta_financeira_id: pedido.conta_pagamento_id || '',
        conta_financeira_nome: contaNome,
        referencia_id: pedido.id,
        referencia_tipo: 'PedidoCompra',
        referencia_numero: pedido.numero,
        observacoes: 'Lançamento recriado automaticamente para pedido já aprovado.',
        is_custo_mercadoria: true,
        pedido_compra_vinculado_id: pedido.id,
        pedido_compra_vinculado_numero: pedido.numero,
      });

      reparados.push({ id: pedido.id, numero: pedido.numero, valor: pedido.valor_total || 0 });
    }

    return Response.json({ success: true, quantidade: reparados.length, reparados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
