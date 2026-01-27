import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    console.log('=== INICIO ===');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.log('Usuario nao autenticado');
      return Response.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    console.log('Usuario OK:', user.email);

    const body = await req.json();
    console.log('Body recebido:', body);
    
    const pedido_id = body?.pedido_id;

    if (!pedido_id) {
      console.log('pedido_id ausente');
      return Response.json({ error: 'pedido_id obrigatorio' }, { status: 400 });
    }

    console.log('Buscando pedido:', pedido_id);
    const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id });
    
    if (!pedidos || pedidos.length === 0) {
      console.log('Pedido nao encontrado');
      return Response.json({ error: 'Pedido nao encontrado' }, { status: 404 });
    }
    
    const pedido = pedidos[0];
    console.log('Pedido encontrado:', pedido.numero);
    
    // Por enquanto retorna JSON para debug
    return Response.json({ 
      success: true,
      pedido_numero: pedido.numero,
      pedido_fornecedor: pedido.fornecedor_nome,
      itens_count: pedido.itens?.length || 0,
      valor_total: pedido.valor_total
    });

  } catch (error) {
    console.error('ERRO COMPLETO:', error);
    console.error('Stack:', error.stack);
    return Response.json({ 
      error: 'Erro interno',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});