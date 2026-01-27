import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    console.log('=== INÍCIO ===');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const pedido_id = body?.pedido_id;

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id obrigatório' }, { status: 400 });
    }

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id });
    
    if (!pedidos || pedidos.length === 0) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }
    
    const pedido = pedidos[0];

    // Por enquanto, retorna JSON ao invés de PDF para testar
    return Response.json({ 
      success: true,
      pedido_numero: pedido.numero,
      pedido_fornecedor: pedido.fornecedor_nome,
      message: 'Função funcionando! Agora vou adicionar geração de PDF.'
    });

  } catch (error) {
    console.error('ERRO:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});