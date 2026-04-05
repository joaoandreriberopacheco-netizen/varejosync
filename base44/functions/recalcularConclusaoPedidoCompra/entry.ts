import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const STATUS_PEDIDO_CONCLUIDO = 'Concluído';
const STATUS_PEDIDO_PENDENCIA = 'Pendência';
const STATUS_PEDIDO_EM_CONFERENCIA = 'Em Conferência';

function hasItensAssociados(embarque) {
  return (embarque?.itens || embarque?.itens_embarcados || []).some((item) => (Number(item?.quantidade_embarcada) || 0) > 0);
}

function getItensDoEmbarque(embarque) {
  return embarque?.itens || embarque?.itens_embarcados || [];
}

function isEmbarqueRealInformado(embarque) {
  const itens = getItensDoEmbarque(embarque);
  const temItens = itens.some((item) => (Number(item?.quantidade_embarcada) || 0) > 0);
  const temTransporte = !!(embarque?.transportadora_id || embarque?.transportadora_nome || embarque?.eta || embarque?.data_embarque);
  return temItens && temTransporte;
}

function isNecessidadeRenderizada(embarque) {
  return !!embarque?.observacoes && String(embarque.observacoes).includes('criado automaticamente para itens pendentes');
}

function calcularPercentualPorStatus(pedido, embarques) {
  const itensPedido = new Map((pedido.itens || []).map((item) => [item.produto_id, Number(item.quantidade) || 0]));
  const totalPedido = Array.from(itensPedido.values()).reduce((acc, qtd) => acc + qtd, 0);
  if (!totalPedido) return { percentual_despachado: 0, percentual_concluido: 0, percentual_pendente: 100 };

  const despachadoMap = {};
  const concluidoMap = {};

  for (const embarque of embarques || []) {
    for (const item of (embarque.itens || embarque.itens_embarcados || [])) {
      const qtdEmbarcada = Number(item.quantidade_embarcada) || 0;
      const qtdRecebida = Number(item.quantidade_recebida) || 0;
      despachadoMap[item.produto_id] = (despachadoMap[item.produto_id] || 0) + qtdEmbarcada;
      concluidoMap[item.produto_id] = (concluidoMap[item.produto_id] || 0) + qtdRecebida;
    }
  }

  let totalDespachado = 0;
  let totalConcluido = 0;
  for (const [produtoId, qtdPedido] of itensPedido.entries()) {
    totalDespachado += Math.min(qtdPedido, despachadoMap[produtoId] || 0);
    totalConcluido += Math.min(qtdPedido, concluidoMap[produtoId] || 0);
  }

  const percentualDespachado = Number(((totalDespachado / totalPedido) * 100).toFixed(2));
  const percentualConcluido = Number(((totalConcluido / totalPedido) * 100).toFixed(2));
  const percentualPendente = Number(Math.max(0, (100 - percentualDespachado)).toFixed(2));

  return {
    percentual_despachado: percentualDespachado,
    percentual_concluido: percentualConcluido,
    percentual_pendente: percentualPendente,
  };
}

function normalizarNumero(valor) {
  return Number(valor) || 0;
}

function calcularResumoItensPedido(pedido, embarques) {
  const resumo = new Map();

  for (const item of pedido.itens || []) {
    const produtoId = item.produto_id;
    if (!produtoId) continue;

    if (!resumo.has(produtoId)) {
      resumo.set(produtoId, {
        produto_id: produtoId,
        produto_nome: item.produto_nome || '',
        quantidade_pedida: 0,
        quantidade_recebida: 0,
      });
    }

    const atual = resumo.get(produtoId);
    atual.quantidade_pedida += normalizarNumero(item.quantidade_base || item.quantidade);
  }

  for (const embarque of embarques || []) {
    for (const item of getItensDoEmbarque(embarque)) {
      const produtoResolvidoId = item.produto_id;
      if (produtoResolvidoId && resumo.has(produtoResolvidoId)) {
        const quantidadeRecebida = normalizarNumero(item.quantidade_recebida || item.quantidade_embarcada);
        resumo.get(produtoResolvidoId).quantidade_recebida += quantidadeRecebida;
      }
    }
  }

  return Array.from(resumo.values());
}

function extrairItensOrfaosDoRecebimento(pedido, embarques) {
  const itensPedido = new Map((pedido.itens || []).map((item) => [item.produto_id, normalizarNumero(item.quantidade_base || item.quantidade)]));
  const recebidos = new Map();

  for (const embarque of embarques || []) {
    for (const item of getItensDoEmbarque(embarque)) {
      const produtoId = item.produto_id;
      if (!produtoId) continue;
      const quantidadeRecebida = normalizarNumero(item.quantidade_recebida || item.quantidade_embarcada);
      recebidos.set(produtoId, normalizarNumero(recebidos.get(produtoId)) + quantidadeRecebida);
    }
  }

  return Array.from(itensPedido.entries()).filter(([produtoId, quantidadePedida]) => {
    return normalizarNumero(recebidos.get(produtoId)) < quantidadePedida;
  });
}

function calcularPendenciasResolvidasFinanceiramente(pedido, lancamentos) {
  return lancamentos.some((lancamento) => {
    const observacoes = String(lancamento.observacoes || '').toLowerCase();
    const descricao = String(lancamento.descricao || '').toLowerCase();
    const vinculado = lancamento.pedido_compra_vinculado_id === pedido.id || lancamento.referencia_id === pedido.id;
    const mencionaOrfaos = observacoes.includes('itens órfãos') || observacoes.includes('itens orfaos') || descricao.includes('não entregues') || descricao.includes('nao entregues');
    const emAbertoOuPago = ['Em Aberto', 'Pago'].includes(lancamento.status);

    return vinculado && mencionaOrfaos && emAbertoOuPago;
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pedidoId } = await req.json();

    if (!pedidoId) {
      return Response.json({ error: 'pedidoId é obrigatório' }, { status: 400 });
    }

    const pedidos = await base44.entities.PedidoCompra.filter({ id: pedidoId });
    const pedido = pedidos?.[0];

    if (!pedido) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    let embarques = await base44.entities.Embarque.filter({ pedido_compra_id: pedido.id });
    const embarquesComItensAssociados = embarques.filter((embarque) => hasItensAssociados(embarque));
    const embarquesReaisInformados = embarques.filter((embarque) => isEmbarqueRealInformado(embarque));
    const lancamentos = await base44.entities.LancamentoFinanceiro.filter({ pedido_compra_vinculado_id: pedido.id });
    const resumoItens = calcularResumoItensPedido(pedido, embarquesComItensAssociados);
    const itensComPendencia = resumoItens.filter((item) => item.quantidade_recebida < item.quantidade_pedida);
    const itensOrfaosRecebimento = extrairItensOrfaosDoRecebimento(pedido, embarquesComItensAssociados);
    const temEmbarqueInformado = embarquesReaisInformados.length > 0;
    const haItensOrfaos = itensOrfaosRecebimento.length > 0;
    const temPendenciaReal = temEmbarqueInformado && haItensOrfaos;
    const temDivergencia = embarquesComItensAssociados.some((embarque) =>
      getItensDoEmbarque(embarque).some((item) => item.divergencia_tipo && item.divergencia_tipo !== 'Nenhuma')
    );
    const pendenciaResolvidaFinanceiramente = temPendenciaReal && calcularPendenciasResolvidasFinanceiramente(pedido, lancamentos);

    const itensNecessidade = itensOrfaosRecebimento.map(([produtoId, quantidadePedida]) => {
      const itemPedido = (pedido.itens || []).find((item) => item.produto_id === produtoId);
      const quantidadeRecebida = resumoItens.find((item) => item.produto_id === produtoId)?.quantidade_recebida || 0;
      return {
        produto_id: produtoId,
        produto_nome: itemPedido?.produto_nome || '',
        quantidade_pedida: quantidadePedida,
        quantidade_embarcada: Math.max(0, quantidadePedida - quantidadeRecebida),
        quantidade_recebida: 0,
        unidade_medida: itemPedido?.unidade_medida || ''
      };
    }).filter((item) => item.quantidade_embarcada > 0);

    const embarquesNecessidade = embarques.filter((embarque) => isNecessidadeRenderizada(embarque));
    const necessidadeAtiva = embarquesNecessidade.find((embarque) => {
      const statusRecebimento = embarque.status_recebimento;
      return statusRecebimento !== 'Recebido OK' && embarque.status !== 'Concluído';
    });

    if (temEmbarqueInformado && itensNecessidade.length > 0) {
      if (necessidadeAtiva) {
        await base44.entities.Embarque.update(necessidadeAtiva.id, {
          status: 'Pendente',
          status_recebimento: 'Pendente',
          itens: itensNecessidade,
          observacoes: necessidadeAtiva.observacoes || 'Embarque de necessidade criado automaticamente para itens pendentes.'
        });
      } else {
        await base44.entities.Embarque.create({
          pedido_compra_id: pedido.id,
          pedido_compra_numero: pedido.numero,
          fornecedor_id: pedido.fornecedor_id,
          fornecedor_nome: pedido.fornecedor_nome,
          status: 'Pendente',
          status_recebimento: 'Pendente',
          observacoes: 'Embarque de necessidade criado automaticamente para itens pendentes.',
          itens: itensNecessidade
        });
      }
    } else if (necessidadeAtiva) {
      await base44.entities.Embarque.update(necessidadeAtiva.id, {
        status: 'Concluído',
        status_recebimento: 'Recebido OK',
        itens: getItensDoEmbarque(necessidadeAtiva)
      });
    }

    embarques = await base44.entities.Embarque.filter({ pedido_compra_id: pedido.id });

    let statusRecebimentoGeral = 'Pendente';
    let statusPedido = pedido.status;

    if (!temPendenciaReal && itensComPendencia.length === 0) {
      statusRecebimentoGeral = temDivergencia ? 'Concluído com Divergência' : 'Concluído OK';
      statusPedido = STATUS_PEDIDO_CONCLUIDO;
    } else if (pendenciaResolvidaFinanceiramente) {
      statusRecebimentoGeral = 'Concluído com Divergência';
      statusPedido = STATUS_PEDIDO_CONCLUIDO;
    } else if (temPendenciaReal) {
      statusRecebimentoGeral = 'Recebido Parcial';
      statusPedido = STATUS_PEDIDO_PENDENCIA;
    } else if (temEmbarqueInformado) {
      statusRecebimentoGeral = 'Pendente';
      statusPedido = STATUS_PEDIDO_EM_CONFERENCIA;
    }

    const resumoPendencias = itensComPendencia.map((item) => ({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade_pedida: item.quantidade_pedida,
      quantidade_recebida: item.quantidade_recebida,
      quantidade_pendente: Math.max(0, item.quantidade_pedida - item.quantidade_recebida),
    }));

    const percentuais = calcularPercentualPorStatus(pedido, embarquesComItensAssociados);
    const proximaEta = embarquesComItensAssociados
      .filter((embarque) => embarque.status !== 'Concluído' && embarque.eta)
      .map((embarque) => embarque.eta)
      .sort()[0];

    await base44.entities.PedidoCompra.update(pedido.id, {
      status: statusPedido,
      status_embarque: !temEmbarqueInformado ? 'Nenhum' : percentuais.percentual_despachado >= 100 ? 'Total' : 'Parcial',
      status_recebimento_geral: statusRecebimentoGeral,
      tem_divergencias: temDivergencia || (temPendenciaReal && !pendenciaResolvidaFinanceiramente),
      percentual_valor_embarcado: percentuais.percentual_despachado,
      percentual_despachado: percentuais.percentual_despachado,
      percentual_concluido: percentuais.percentual_concluido,
      percentual_pendente: percentuais.percentual_pendente,
      data_prevista_entrega: proximaEta ? String(proximaEta).slice(0, 10) : null,
      historico: `${pedido.historico || ''}\n[RECALCULO CONCLUSAO | status=${statusPedido} | recebimento=${statusRecebimentoGeral} | pendencias=${resumoPendencias.length}]`,
    });

    return Response.json({
      success: true,
      pedidoId: pedido.id,
      status: statusPedido,
      status_recebimento_geral: statusRecebimentoGeral,
      pendencia_resolvida_financeiramente: pendenciaResolvidaFinanceiramente,
      pendencias: resumoPendencias,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});