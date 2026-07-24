// Port automático de base44/functions/vincularItensPedidoAManifesto/entry.ts
import type { createP38Client } from '../p38Client.ts';

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { supermanifesto_id, pedido_id, itens_vinculados } = await req.json();

    if (!supermanifesto_id || !pedido_id || !itens_vinculados || itens_vinculados.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Dados incompletos: supermanifesto_id, pedido_id e itens_vinculados são obrigatórios' 
      }, { status: 400 });
    }

    // 1. Buscar o supermanifesto
    const supermanifesto = await base44.asServiceRole.entities.Supermanifesto.get(supermanifesto_id);
    if (!supermanifesto) {
      return Response.json({ success: false, error: 'Supermanifesto não encontrado' }, { status: 404 });
    }

    // 2. Buscar o pedido
    const pedido = await base44.asServiceRole.entities.PedidoCompra.get(pedido_id);
    if (!pedido) {
      return Response.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 });
    }

    // 3. Validar se o pedido é da mesma transportadora
    if (pedido.fornecedor_id !== supermanifesto.transportadora_id) {
      return Response.json({ 
        success: false, 
        error: 'Pedido não pertence à transportadora deste manifesto' 
      }, { status: 400 });
    }

    // 4. Atualizar quantidade_vinculada nos itens do pedido
    const itensAtualizados = pedido.itens.map(item => {
      const itemVinculado = itens_vinculados.find(iv => iv.produto_id === item.produto_id);
      if (itemVinculado) {
        const novaQuantidadeVinculada = (item.quantidade_vinculada || 0) + itemVinculado.quantidade_despachada;
        return {
          ...item,
          quantidade_vinculada: novaQuantidadeVinculada
        };
      }
      return item;
    });

    // 5. Verificar status do pedido após vinculação
    const todosItensVinculados = itensAtualizados.every(item => 
      (item.quantidade_vinculada || 0) >= (item.quantidade || 0)
    );
    const algumItemVinculado = itensAtualizados.some(item => 
      (item.quantidade_vinculada || 0) > 0
    );

    let novoStatus = pedido.status;
    if (todosItensVinculados) {
      novoStatus = 'Despachado';
    } else if (algumItemVinculado) {
      novoStatus = 'Parcialmente Despachado';
    }

    // 6. Atualizar o pedido
    await base44.asServiceRole.entities.PedidoCompra.update(pedido_id, {
      itens: itensAtualizados,
      status: novoStatus
    });

    // 7. Adicionar/Atualizar pedido no supermanifesto
    const pedidosVinculados = supermanifesto.pedidos_vinculados || [];
    const pedidoVinculadoExistente = pedidosVinculados.find(pv => pv.pedido_id === pedido_id);

    if (pedidoVinculadoExistente) {
      // Atualizar itens vinculados existentes
      pedidoVinculadoExistente.itens_vinculados = [
        ...(pedidoVinculadoExistente.itens_vinculados || []),
        ...itens_vinculados
      ];
    } else {
      // Adicionar novo pedido vinculado
      pedidosVinculados.push({
        pedido_id: pedido.id,
        pedido_numero: pedido.numero,
        itens_vinculados: itens_vinculados,
        descritivo_volumes: '',
        peso_informado_kg: 0
      });
    }

    // 8. Recalcular totais do supermanifesto
    const valorTotal = pedidosVinculados.reduce((acc, pv) => {
      const valorPedido = (pv.itens_vinculados || []).reduce((sum, item) => {
        const itemOriginal = pedido.itens.find(i => i.produto_id === item.produto_id);
        return sum + (item.quantidade_despachada * (itemOriginal?.custo_unitario || 0));
      }, 0);
      return acc + valorPedido;
    }, 0);

    // 9. Atualizar o supermanifesto
    await base44.asServiceRole.entities.Supermanifesto.update(supermanifesto_id, {
      pedidos_vinculados: pedidosVinculados,
      valor_total_estimado: valorTotal
    });

    return Response.json({ 
      success: true, 
      message: 'Itens vinculados com sucesso',
      pedido_status: novoStatus
    });

  } catch (error) {
    console.error('Erro ao vincular itens:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
