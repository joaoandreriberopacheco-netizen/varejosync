import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function toNumber(value) {
  return Number(value) || 0;
}

function buildOriginalShipment(pedido, embarqueLegado = null) {
  const itensOriginais = (pedido.itens || []).map((item) => ({
    produto_id: item.produto_id,
    produto_nome: item.produto_nome,
    quantidade_pedida: toNumber(item.quantidade_base || item.quantidade),
    quantidade_embarcada: 0,
    quantidade_recebida: 0,
    unidade_medida: item.unidade_medida,
    divergencia_tipo: 'Nenhuma'
  }));

  return {
    id: `orig_${pedido.id}`,
    numero: '00',
    tipo: 'Original',
    status: pedido.data_despacho ? 'Despachado' : 'Pendente',
    data_embarque: null,
    eta: null,
    transportadora_id: '',
    transportadora_nome: '',
    volumes: '',
    volumes_detalhados: [],
    peso_kg: 0,
    observacoes: 'Migrado automaticamente a partir dos campos legados do pedido.',
    status_recebimento_embarque: pedido.status_recebimento_geral === 'Concluído OK' ? 'Recebido OK' : pedido.status_recebimento_geral === 'Recebido Parcial' ? 'Recebido Parcial' : 'Pendente',
    itens_embarcados: itensOriginais
  };
}

function mergeLegacyIntoOriginal(original, pedido, movimentos) {
  const recebidosPorProduto = {};
  for (const movimento of movimentos) {
    if (movimento.referencia_tipo !== 'PedidoCompra' || movimento.referencia_id !== pedido.id) continue;
    if (movimento.tipo !== 'Entrada') continue;
    recebidosPorProduto[movimento.produto_id] = (recebidosPorProduto[movimento.produto_id] || 0) + toNumber(movimento.quantidade);
  }

  const itensAtualizados = (original.itens_embarcados || []).map((item) => {
    const quantidadePedida = toNumber(item.quantidade_pedida);
    const quantidadeRecebida = Math.min(quantidadePedida, recebidosPorProduto[item.produto_id] || 0);
    const quantidadeEmbarcada = pedido.data_despacho ? quantidadePedida : quantidadeRecebida;
    return {
      ...item,
      quantidade_embarcada: quantidadeEmbarcada,
      quantidade_recebida: quantidadeRecebida,
    };
  });

  const totalEmbarcado = itensAtualizados.reduce((acc, item) => acc + toNumber(item.quantidade_embarcada), 0);
  const totalRecebido = itensAtualizados.reduce((acc, item) => acc + toNumber(item.quantidade_recebida), 0);

  return {
    ...original,
    status: totalRecebido >= totalEmbarcado && totalEmbarcado > 0 ? 'Concluído' : totalEmbarcado > 0 ? 'Despachado' : 'Pendente',
    status_recebimento_embarque: totalRecebido >= totalEmbarcado && totalEmbarcado > 0 ? 'Recebido OK' : totalRecebido > 0 ? 'Recebido Parcial' : 'Pendente',
    itens_embarcados: itensAtualizados,
  };
}

function buildLegacyShipment(pedido, originalAnterior) {
  const temDadosLegados = Boolean(pedido.data_despacho || pedido.data_chegada || pedido.data_prevista_entrega);
  if (!temDadosLegados) return null;

  const itens = (originalAnterior?.itens_embarcados || []).map((item) => ({
    ...item,
    quantidade_recebida: 0,
  })).filter((item) => toNumber(item.quantidade_embarcada) > 0);

  if (!itens.length) return null;

  return {
    id: `emb_leg_${pedido.id}`,
    numero: '01',
    tipo: 'Embarque',
    status: pedido.data_despacho ? 'Despachado' : 'Pendente',
    data_embarque: pedido.data_despacho || null,
    eta: pedido.data_chegada || (pedido.data_prevista_entrega ? `${pedido.data_prevista_entrega}T12:00:00.000Z` : null),
    transportadora_id: '',
    transportadora_nome: '',
    volumes: '',
    volumes_detalhados: [],
    peso_kg: 0,
    observacoes: 'Embarque legado reconstruído automaticamente a partir dos campos antigos do pedido.',
    status_recebimento_embarque: 'Pendente',
    itens_embarcados: itens
  };
}

function buildNeedShipmentFromSaldo(original, embarques) {
  const itensSaldo = (original.itens_embarcados || []).map((item) => {
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

  if (!itensSaldo.length) return null;

  const existente = embarques.find((emb) => emb.tipo === 'Necessidade');
  return {
    id: existente?.id || `nec_${original.id}`,
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
    observacoes: 'Migrado automaticamente a partir do saldo pendente legado.',
    status_recebimento_embarque: 'Pendente',
    itens_embarcados: itensSaldo
  };
}

function calcularPercentuais(pedido, original) {
  const totalPedido = (pedido.itens || []).reduce((acc, item) => acc + toNumber(item.quantidade_base || item.quantidade), 0);
  if (!totalPedido) {
    return { percentual_valor_embarcado: 0, percentual_despachado: 0, percentual_concluido: 0, percentual_pendente: 100 };
  }

  const totalDespachado = (original.itens_embarcados || []).reduce((acc, item) => acc + Math.min(toNumber(item.quantidade_pedida), toNumber(item.quantidade_embarcada)), 0);
  const totalConcluido = (original.itens_embarcados || []).reduce((acc, item) => acc + Math.min(toNumber(item.quantidade_pedida), toNumber(item.quantidade_recebida)), 0);

  const percentualDespachado = Number(((totalDespachado / totalPedido) * 100).toFixed(2));
  const percentualConcluido = Number(((totalConcluido / totalPedido) * 100).toFixed(2));
  const percentualPendente = Number(Math.max(0, 100 - percentualDespachado).toFixed(2));

  return {
    percentual_valor_embarcado: percentualDespachado,
    percentual_despachado: percentualDespachado,
    percentual_concluido: percentualConcluido,
    percentual_pendente: percentualPendente,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.list();
    const movimentos = await base44.asServiceRole.entities.MovimentacaoEstoque.list();
    const updated = [];

    for (const pedido of pedidos) {
      const embarquesAtuais = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];
      const originalAtual = embarquesAtuais.find((emb) => emb.tipo === 'Original');
      const outrosExistentes = embarquesAtuais.filter((emb) => emb.tipo !== 'Original' && emb.tipo !== 'Necessidade' && emb.id !== `emb_leg_${pedido.id}`);

      const originalBase = originalAtual || buildOriginalShipment(pedido);
      const original = mergeLegacyIntoOriginal(originalBase, pedido, movimentos);
      const embarqueLegado = buildLegacyShipment(pedido, original);
      const outros = embarqueLegado ? [embarqueLegado, ...outrosExistentes] : outrosExistentes;
      const necessidade = buildNeedShipmentFromSaldo(original, embarquesAtuais);
      const embarquesFinal = [original, ...outros, ...(necessidade ? [necessidade] : [])];
      const percentuais = calcularPercentuais(pedido, original);

      await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, {
        embarques_registrados: embarquesFinal,
        status_embarque: necessidade ? 'Parcial' : (percentuais.percentual_despachado >= 100 ? 'Total' : percentuais.percentual_despachado > 0 ? 'Parcial' : 'Nenhum'),
        ...percentuais,
        historico: `${pedido.historico || ''}\n[MIGRAÇÃO LEGADA EMBARQUE/RECEBIMENTO | original=${original.id} | necessidade=${necessidade ? necessidade.id : 'nenhuma'}]`
      });

      updated.push({ numero: pedido.numero, pedidoId: pedido.id });
    }

    return Response.json({ success: true, updatedCount: updated.length, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});