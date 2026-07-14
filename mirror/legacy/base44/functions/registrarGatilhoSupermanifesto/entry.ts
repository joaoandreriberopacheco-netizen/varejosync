import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supermanifesto_id, manifesto_ids } = await req.json();

    if (!supermanifesto_id || !manifesto_ids || manifesto_ids.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Buscar supermanifesto e manifestos
    const supermanifesto = await base44.asServiceRole.entities.Supermanifesto.get(supermanifesto_id);
    const manifestos = await Promise.all(
      manifesto_ids.map(id => base44.asServiceRole.entities.ManifestoEntrada.get(id))
    );

    // Para cada manifesto, registrar log de transição de status no pedido_compra associado
    const logsRegistrados = [];
    
    for (const manifesto of manifestos) {
      if (!manifesto.pedido_id) continue;

      // Buscar o pedido de compra atual
      const pedido = await base44.asServiceRole.entities.PedidoCompra.get(manifesto.pedido_id);
      const statusAnterior = pedido.status;
      
      // Determinar novo status (Aprovado -> Despachado)
      const statusNovo = statusAnterior === 'Aprovado' ? 'Despachado' : statusAnterior;

      // Registrar transição apenas se houver mudança
      if (statusAnterior !== statusNovo) {
        const log = await base44.asServiceRole.entities.TransicaoPedidoCompra.create({
          pedido_id: pedido.id,
          pedido_numero: pedido.numero,
          status_anterior: statusAnterior,
          status_novo: statusNovo,
          responsavel_id: user.id,
          responsavel_nome: user.full_name,
          responsavel_email: user.email,
          tipo_autenticacao: 'Usuario',
          codigo_operacao: `SM-${supermanifesto.numero}`,
          observacao: `Pedido vinculado ao supermanifesto ${supermanifesto.numero}`,
          data_transicao: new Date().toISOString()
        });

        // Atualizar status do pedido
        await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, {
          status: statusNovo,
          data_despacho: new Date().toISOString()
        });

        logsRegistrados.push(log);
      }
    }

    return Response.json({
      success: true,
      logsRegistrados: logsRegistrados.length,
      message: `${logsRegistrados.length} log(s) de transição registrado(s)`
    });
  } catch (error) {
    console.error('Erro ao registrar gatilho:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});