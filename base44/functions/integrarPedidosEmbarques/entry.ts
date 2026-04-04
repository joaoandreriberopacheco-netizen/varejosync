import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function toNumber(value) {
  return Number(value) || 0;
}

function buildOriginalFromPedido(pedido, existentes = []) {
  const mapa = new Map();

  for (const item of pedido.itens || []) {
    if (!item.produto_id) continue;
    mapa.set(item.produto_id, {
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade_pedida: toNumber(item.quantidade_base || item.quantidade),
      quantidade_embarcada: 0,
      quantidade_recebida: 0,
      unidade_medida: item.unidade_medida,
      divergencia_tipo: 'Nenhuma'
    });
  }

  for (const embarque of existentes) {
    for (const item of embarque.itens_embarcados || []) {
      if (!item.produto_id || !mapa.has(item.produto_id)) continue;
      const atual = mapa.get(item.produto_id);
      atual.quantidade_embarcada += toNumber(item.quantidade_embarcada);
      atual.quantidade_recebida += toNumber(item.quantidade_recebida);
      if ((item.divergencia_tipo || 'Nenhuma') !== 'Nenhuma') {
        atual.divergencia_tipo = item.divergencia_tipo;
      }
    }
  }

  const itens = Array.from(mapa.values());
  const totalEmbarcado = itens.reduce((acc, item) => acc + item.quantidade_embarcada, 0);
  const totalRecebido = itens.reduce((acc, item) => acc + item.quantidade_recebida, 0);

  return {
    id: `orig_${pedido.id}`,
    numero: '00',
    tipo: 'Original',
    status: totalEmbarcado > 0 ? (totalRecebido >= totalEmbarcado ? 'Concluído' : 'Despachado') : 'Pendente',
    data_embarque: existentes[0]?.data_embarque || null,
    eta: existentes[0]?.eta || null,
    transportadora_id: existentes[0]?.transportadora_id || '',
    transportadora_nome: existentes[0]?.transportadora_nome || '',
    volumes: existentes[0]?.volumes || '',
    volumes_detalhados: existentes[0]?.volumes_detalhados || [],
    peso_kg: toNumber(existentes[0]?.peso_kg),
    observacoes: 'Embarque original criado automaticamente para compatibilização.',
    status_recebimento_embarque: totalRecebido >= totalEmbarcado && totalEmbarcado > 0 ? 'Recebido OK' : totalRecebido > 0 ? 'Recebido Parcial' : 'Pendente',
    itens_embarcados: itens
  };
}

function buildNeedShipmentFromOriginal(original, existingNeed) {
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

  if (!itensOrfaos.length) return null;

  return {
    id: existingNeed?.id || `nec_${Date.now()}`,
    numero: existingNeed?.numero || '01',
    tipo: 'Necessidade',
    status: 'Pendente',
    data_embarque: null,
    eta: null,
    transportadora_id: '',
    transportadora_nome: '',
    volumes: '',
    volumes_detalhados: [],
    peso_kg: 0,
    observacoes: 'Embarque órfão gerado automaticamente por saldo pendente do embarque original.',
    status_recebimento_embarque: 'Pendente',
    itens_embarcados: itensOrfaos
  };
}

function calcularPercentuais(pedido, embarques) {
  const totalPedido = (pedido.itens || []).reduce((acc, item) => acc + toNumber(item.quantidade_base || item.quantidade), 0);
  if (!totalPedido) {
    return { percentual_valor_embarcado: 0, percentual_despachado: 0, percentual_concluido: 0, percentual_pendente: 100 };
  }

  const original = embarques.find((emb) => emb.tipo === 'Original');
  const totalDespachado = (original?.itens_embarcados || []).reduce((acc, item) => acc + Math.min(toNumber(item.quantidade_pedida), toNumber(item.quantidade_embarcada)), 0);
  const totalConcluido = (original?.itens_embarcados || []).reduce((acc, item) => acc + Math.min(toNumber(item.quantidade_pedida), toNumber(item.quantidade_recebida)), 0);

  const percentualDespachado = Number(((totalDespachado / totalPedido) * 100).toFixed(2));
  const percentualConcluido = Number(((totalConcluido / totalPedido) * 100).toFixed(2));
  const percentualPendente = Number(Math.max(0, 100 - percentualDespachado).toFixed(2));

  return {
    percentual_valor_embarcado: percentualDespachado,
    percentual_despachado: percentualDespachado,
    percentual_concluido: percentualConcluido,
    percentual_pendente: percentualPendente
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { numeros = [] } = await req.json();
    if (!Array.isArray(numeros) || !numeros.length) {
      return Response.json({ error: 'numeros é obrigatório' }, { status: 400 });
    }

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.list();
    const alvo = pedidos.filter((pedido) => numeros.includes(pedido.numero));
    const updated = [];

    for (const pedido of alvo) {
      const embarquesAtuais = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];
      const originalExistente = embarquesAtuais.find((emb) => emb.tipo === 'Original');
      const outros = embarquesAtuais.filter((emb) => emb.tipo !== 'Original' && emb.tipo !== 'Necessidade').map((emb, index) => ({
        ...emb,
        numero: emb.numero || String(index + 1).padStart(2, '0'),
        tipo: emb.tipo || 'Embarque',
        status: emb.status || (emb.data_embarque ? 'Despachado' : 'Pendente'),
        status_recebimento_embarque: emb.status_recebimento_embarque || 'Pendente'
      }));

      const original = originalExistente ? {
        ...originalExistente,
        ...buildOriginalFromPedido(pedido, outros),
        id: originalExistente.id,
        numero: '00'
      } : buildOriginalFromPedido(pedido, outros);

      const necessidadeExistente = embarquesAtuais.find((emb) => emb.tipo === 'Necessidade');
      const necessidade = buildNeedShipmentFromOriginal(original, necessidadeExistente);
      const embarques = [original, ...outros, ...(necessidade ? [necessidade] : [])];
      const percentuais = calcularPercentuais(pedido, embarques);

      await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, {
        embarques_registrados: embarques,
        status_embarque: necessidade ? 'Parcial' : (percentuais.percentual_despachado >= 100 ? 'Total' : 'Nenhum'),
        ...percentuais,
        historico: `${pedido.historico || ''}\n[INTEGRAÇÃO EMBARQUES | original=${original.id} | necessidade=${necessidade ? necessidade.id : 'nenhuma'}]`
      });

      updated.push({ numero: pedido.numero, pedidoId: pedido.id, necessidade: !!necessidade });
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});