import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function normalizeOriginalShipment(pedido) {
  const embarques = Array.isArray(pedido.embarques_registrados) ? [...pedido.embarques_registrados] : [];
  const hasOriginal = embarques.some((emb) => emb?.tipo === 'Original');
  if (hasOriginal) return null;

  const original = {
    id: `orig_${pedido.id}`,
    numero: '00',
    tipo: 'Original',
    status: 'Pendente',
    data_embarque: null,
    eta: null,
    transportadora_id: '',
    transportadora_nome: '',
    volumes: '',
    volumes_detalhados: [],
    peso_kg: 0,
    observacoes: 'Embarque original criado automaticamente para compatibilização.',
    status_recebimento_embarque: 'Pendente',
    itens_embarcados: (pedido.itens || []).map((item) => ({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade_pedida: Number(item.quantidade) || 0,
      quantidade_embarcada: 0,
      quantidade_recebida: 0,
      unidade_medida: item.unidade_medida,
      divergencia_tipo: 'Nenhuma'
    }))
  };

  return [original, ...embarques.map((emb, index) => ({
    ...emb,
    numero: emb.numero || String(index + 1).padStart(2, '0'),
    tipo: emb.tipo || 'Embarque',
    status: emb.status || (emb.data_embarque ? 'Despachado' : 'Pendente'),
    status_recebimento_embarque: emb.status_recebimento_embarque || 'Pendente'
  }))];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.list();
    let updated = 0;

    for (const pedido of pedidos) {
      const embarquesAtualizados = normalizeOriginalShipment(pedido);
      if (!embarquesAtualizados) continue;

      await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, {
        embarques_registrados: embarquesAtualizados,
        status_embarque: pedido.status_embarque || 'Nenhum',
        status_recebimento_geral: pedido.status_recebimento_geral || 'Nenhum'
      });
      updated += 1;
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});