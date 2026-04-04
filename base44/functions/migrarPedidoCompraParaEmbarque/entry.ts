import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function toNumber(value) {
  return Number(value) || 0;
}

function normalizarItens(embarque, pedido) {
  return (embarque.itens_embarcados || []).map((item) => ({
    produto_id: item.produto_id,
    produto_nome: item.produto_nome,
    quantidade_pedida: toNumber(item.quantidade_pedida),
    quantidade_embarcada: toNumber(item.quantidade_embarcada),
    quantidade_recebida: toNumber(item.quantidade_recebida),
    unidade_medida: item.unidade_medida,
    divergencia_tipo: item.divergencia_tipo || 'Nenhuma',
    produto_id_recebido_diferente: item.produto_id_recebido_diferente || '',
    produto_nome_recebido_diferente: item.produto_nome_recebido_diferente || '',
    acordo_financeiro_lancamento_id: item.acordo_financeiro_lancamento_id || ''
  }));
}

function normalizarStatusRecebimento(status) {
  return status || 'Pendente';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.list();
    const manifestos = await base44.asServiceRole.entities.ManifestoEntrada.list();
    const supermanifestos = await base44.asServiceRole.entities.Supermanifesto.list();

    const embarquesCriados = [];

    for (const pedido of pedidos) {
      const embarquesRegistrados = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];
      const manifesto = manifestos.find((item) => item.pedido_compra_id === pedido.id) || null;
      const supermanifesto = supermanifestos.find((item) => (item.pedidos_vinculados || []).some((v) => v.pedido_id === pedido.id)) || null;

      for (const embarque of embarquesRegistrados) {
        if (!embarque || embarque.tipo === 'Original') continue;

        await base44.asServiceRole.entities.Embarque.create({
          pedido_compra_id: pedido.id,
          pedido_compra_numero: pedido.numero,
          fornecedor_id: pedido.fornecedor_id,
          fornecedor_nome: pedido.fornecedor_nome,
          numero: embarque.numero || '01',
          tipo: embarque.tipo || 'Embarque',
          status: embarque.status || 'Pendente',
          status_recebimento: normalizarStatusRecebimento(embarque.status_recebimento_embarque),
          data_embarque: embarque.data_embarque || pedido.data_despacho || null,
          eta: embarque.eta || pedido.data_chegada || (pedido.data_prevista_entrega ? `${pedido.data_prevista_entrega}T12:00:00.000Z` : null),
          transportadora_id: embarque.transportadora_id || supermanifesto?.transportadora_id || '',
          transportadora_nome: embarque.transportadora_nome || supermanifesto?.transportadora_nome || '',
          supermanifesto_id: supermanifesto?.id || '',
          manifesto_entrada_id: manifesto?.id || '',
          evento_logistico_id: pedido.evento_logistico_id || '',
          volumes: embarque.volumes || '',
          volumes_detalhados: embarque.volumes_detalhados || [],
          peso_kg: toNumber(embarque.peso_kg),
          observacoes: embarque.observacoes || '',
          itens: normalizarItens(embarque, pedido)
        });

        embarquesCriados.push({ pedido: pedido.numero, embarque: embarque.numero || '01' });
      }

      await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, {
        historico: `${pedido.historico || ''}\n[MIGRAÇÃO PARA ENTIDADE EMBARQUE | total=${embarquesRegistrados.filter((emb) => emb?.tipo !== 'Original').length}]`
      });
    }

    return Response.json({ success: true, total: embarquesCriados.length, embarquesCriados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});