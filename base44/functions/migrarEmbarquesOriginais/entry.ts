import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function buildOriginalFromLegacy(pedido, embarquesLegados) {
  const itensPorProduto = new Map();

  for (const item of pedido.itens || []) {
    if (!item.produto_id) continue;
    itensPorProduto.set(item.produto_id, {
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade_pedida: Number(item.quantidade_base || item.quantidade) || 0,
      quantidade_embarcada: 0,
      quantidade_recebida: 0,
      unidade_medida: item.unidade_medida,
      divergencia_tipo: 'Nenhuma'
    });
  }

  for (const embarque of embarquesLegados) {
    for (const item of embarque.itens_embarcados || []) {
      if (!item.produto_id || !itensPorProduto.has(item.produto_id)) continue;
      const atual = itensPorProduto.get(item.produto_id);
      atual.quantidade_embarcada += Number(item.quantidade_embarcada) || 0;
      atual.quantidade_recebida += Number(item.quantidade_recebida) || 0;
      if ((item.divergencia_tipo || 'Nenhuma') !== 'Nenhuma') {
        atual.divergencia_tipo = item.divergencia_tipo;
      }
    }
  }

  const existeDespacho = Array.from(itensPorProduto.values()).some((item) => item.quantidade_embarcada > 0);
  const totalEmbarcado = Array.from(itensPorProduto.values()).reduce((acc, item) => acc + item.quantidade_embarcada, 0);
  const totalRecebido = Array.from(itensPorProduto.values()).reduce((acc, item) => acc + item.quantidade_recebida, 0);

  return {
    id: `orig_${pedido.id}`,
    numero: '00',
    tipo: 'Original',
    status: existeDespacho ? (totalRecebido >= totalEmbarcado && totalEmbarcado > 0 ? 'Concluído' : 'Despachado') : 'Pendente',
    data_embarque: embarquesLegados[0]?.data_embarque || null,
    eta: embarquesLegados[0]?.eta || null,
    transportadora_id: embarquesLegados[0]?.transportadora_id || '',
    transportadora_nome: embarquesLegados[0]?.transportadora_nome || '',
    volumes: embarquesLegados[0]?.volumes || '',
    volumes_detalhados: embarquesLegados[0]?.volumes_detalhados || [],
    peso_kg: Number(embarquesLegados[0]?.peso_kg) || 0,
    observacoes: 'Embarque original criado automaticamente para compatibilização.',
    status_recebimento_embarque: totalRecebido >= totalEmbarcado && totalEmbarcado > 0 ? 'Recebido OK' : totalRecebido > 0 ? 'Recebido Parcial' : 'Pendente',
    itens_embarcados: Array.from(itensPorProduto.values())
  };
}

function normalizeOriginalShipment(pedido) {
  const embarques = Array.isArray(pedido.embarques_registrados) ? [...pedido.embarques_registrados] : [];
  const hasOriginal = embarques.some((emb) => emb?.tipo === 'Original');
  if (hasOriginal) return null;

  const embarquesLegados = embarques.map((emb, index) => ({
    ...emb,
    numero: emb.numero || String(index + 1).padStart(2, '0'),
    tipo: emb.tipo || 'Embarque',
    status: emb.status || (emb.data_embarque ? 'Despachado' : 'Pendente'),
    status_recebimento_embarque: emb.status_recebimento_embarque || 'Pendente'
  }));

  const original = buildOriginalFromLegacy(pedido, embarquesLegados);
  return [original, ...embarquesLegados];
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