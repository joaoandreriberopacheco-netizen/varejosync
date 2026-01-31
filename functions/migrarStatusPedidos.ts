import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Mapeamento dos status antigos para os novos códigos
    const statusPedidoMap = {
      'Rascunho': 'rascunho',
      'Aguardando Recepção': 'aprovado',
      'Em Trânsito': 'despachado',
      'Recebido Parcialmente': 'parcialmente_despachado',
      'Em Conferência': 'em_conferencia',
      'Recebido': 'concluido',
      'Cancelado': 'cancelado',
      'Aprovado': 'aprovado'
    };

    const statusFinanceiroMap = {
      'Aguardando Aprovação': 'aguardando_aprovacao',
      'Aprovado': 'aprovado',
      'Aprovado Financeiramente': 'aprovado',
      'Rejeitado': 'rejeitado',
      'Rejeitado Financeiramente': 'rejeitado',
      'Solicitação de Edição Pendente': 'solicitacao_edicao_pendente'
    };

    // Buscar todos os pedidos
    const pedidos = await base44.asServiceRole.entities.PedidoCompra.list();
    
    let updated = 0;
    let errors = [];

    for (const pedido of pedidos) {
      try {
        const updates = {};
        
        // Atualizar status principal se necessário
        if (pedido.status && statusPedidoMap[pedido.status]) {
          updates.status = statusPedidoMap[pedido.status];
        }

        // Atualizar status financeiro se necessário
        if (pedido.status_aprovacao_financeira && statusFinanceiroMap[pedido.status_aprovacao_financeira]) {
          updates.status_aprovacao_financeira = statusFinanceiroMap[pedido.status_aprovacao_financeira];
        }

        // Se houver atualizações, aplicar
        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, updates);
          updated++;
        }
      } catch (err) {
        errors.push({ pedido_id: pedido.id, error: err.message });
      }
    }

    return Response.json({
      success: true,
      total_pedidos: pedidos.length,
      pedidos_atualizados: updated,
      erros: errors
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});