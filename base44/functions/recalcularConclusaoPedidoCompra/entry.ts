import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const STATUS_PEDIDO_CONCLUIDO = 'Concluído';
const STATUS_PEDIDO_PENDENCIA = 'Pendência';
const STATUS_PEDIDO_EM_CONFERENCIA = 'Em Conferência';

function normalizarNumero(valor) {
  return Number(valor) || 0;
}

function calcularResumoItensPedido(pedido) {
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

  for (const embarque of pedido.embarques_registrados || []) {
    for (const item of embarque.itens_embarcados || []) {
      const produtoResolvidoId = item.produto_id;
      if (produtoResolvidoId && resumo.has(produtoResolvidoId)) {
        resumo.get(produtoResolvidoId).quantidade_recebida += normalizarNumero(item.quantidade_recebida);
      }
    }
  }

  return Array.from(resumo.values());
}

function calcularPendenciasResolvidasFinanceiramente(pedido, lancamentos) {
  const textoPedido = String(pedido.numero || '').toLowerCase();

  return lancamentos.some((lancamento) => {
    const observacoes = String(lancamento.observacoes || '').toLowerCase();
    const descricao = String(lancamento.descricao || '').toLowerCase();
    const vinculado = lancamento.pedido_compra_vinculado_id === pedido.id || lancamento.referencia_id === pedido.id;
    const mencionaOrfaos = observacoes.includes('itens órfãos') || observacoes.includes('itens orfaos') || descricao.includes('não entregues') || descricao.includes('nao entregues');
    const emAbertoOuPago = ['Em Aberto', 'Pago'].includes(lancamento.status);

    return vinculado && mencionaOrfaos && emAbertoOuPago && (observacoes.includes(textoPedido) || descricao.includes(textoPedido) || true);
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

    const lancamentos = await base44.entities.LancamentoFinanceiro.filter({ pedido_compra_vinculado_id: pedido.id });
    const resumoItens = calcularResumoItensPedido(pedido);
    const itensComPendencia = resumoItens.filter((item) => item.quantidade_recebida < item.quantidade_pedida);
    const temPendenciaFisica = itensComPendencia.length > 0;
    const temDivergencia = (pedido.embarques_registrados || []).some((embarque) =>
      (embarque.itens_embarcados || []).some((item) => item.divergencia_tipo && item.divergencia_tipo !== 'Nenhuma')
    );
    const pendenciaResolvidaFinanceiramente = temPendenciaFisica && calcularPendenciasResolvidasFinanceiramente(pedido, lancamentos);

    let statusRecebimentoGeral = 'Pendente';
    let statusPedido = pedido.status;

    if (!temPendenciaFisica) {
      statusRecebimentoGeral = temDivergencia ? 'Concluído com Divergência' : 'Concluído OK';
      statusPedido = STATUS_PEDIDO_CONCLUIDO;
    } else if (pendenciaResolvidaFinanceiramente) {
      statusRecebimentoGeral = 'Concluído com Divergência';
      statusPedido = STATUS_PEDIDO_CONCLUIDO;
    } else if ((pedido.embarques_registrados || []).length > 0) {
      statusRecebimentoGeral = 'Recebido Parcial';
      statusPedido = temDivergencia ? STATUS_PEDIDO_PENDENCIA : STATUS_PEDIDO_EM_CONFERENCIA;
    }

    const resumoPendencias = itensComPendencia.map((item) => ({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade_pedida: item.quantidade_pedida,
      quantidade_recebida: item.quantidade_recebida,
      quantidade_pendente: Math.max(0, item.quantidade_pedida - item.quantidade_recebida),
    }));

    await base44.entities.PedidoCompra.update(pedido.id, {
      status: statusPedido,
      status_recebimento_geral: statusRecebimentoGeral,
      tem_divergencias: temDivergencia || (temPendenciaFisica && !pendenciaResolvidaFinanceiramente),
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