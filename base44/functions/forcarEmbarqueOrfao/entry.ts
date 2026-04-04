import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function toNumber(value) {
  return Number(value) || 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { numero } = await req.json();
    if (!numero) {
      return Response.json({ error: 'numero é obrigatório' }, { status: 400 });
    }

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.list();
    const pedido = pedidos.find((item) => item.numero === numero);
    if (!pedido) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const embarques = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];
    const original = embarques.find((emb) => emb.tipo === 'Original');
    if (!original) {
      return Response.json({ error: 'Pedido sem embarque original' }, { status: 400 });
    }

    const itensOrfaos = (original.itens_embarcados || []).map((item) => {
      const saldo = Math.max(0, toNumber(item.quantidade_embarcada) - toNumber(item.quantidade_recebida));
      if (!saldo) return null;
      return {
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        quantidade_pedida: saldo,
        quantidade_embarcada: saldo,
        quantidade_recebida: 0,
        unidade_medida: item.unidade_medida,
        divergencia_tipo: 'Nenhuma'
      };
    }).filter(Boolean);

    if (!itensOrfaos.length) {
      return Response.json({ success: true, created: false, reason: 'sem saldo órfão' });
    }

    const existente = embarques.find((emb) => emb.tipo === 'Necessidade');
    const necessidade = {
      id: existente?.id || `nec_${Date.now()}`,
      numero: existente?.numero || '01',
      tipo: 'Necessidade',
      status: 'Pendente',
      data_embarque: null,
      eta: null,
      transportadora_id: '',
      transportadora_nome: '',
      volumes: '',
      volumes_detalhados: [],
      peso_kg: 0,
      observacoes: 'Embarque órfão forçado automaticamente para saldo pendente do original.',
      status_recebimento_embarque: 'Pendente',
      itens_embarcados: itensOrfaos
    };

    const outros = embarques.filter((emb) => emb.tipo !== 'Necessidade');
    await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, {
      embarques_registrados: [...outros, necessidade],
      status_embarque: 'Parcial',
      historico: `${pedido.historico || ''}\n[EMBARQUE ÓRFÃO FORÇADO | numero=${necessidade.numero} | itens=${itensOrfaos.length}]`
    });

    return Response.json({ success: true, created: true, pedidoId: pedido.id, numero });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});