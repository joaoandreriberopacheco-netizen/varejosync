import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
      const produtoId = item.produto_id;
      if (produtoId && resumo.has(produtoId)) {
        resumo.get(produtoId).quantidade_recebida += normalizarNumero(item.quantidade_recebida);
      }
    }
  }

  return Array.from(resumo.values());
}

function calcularPendenciasResolvidasFinanceiramente(pedido, lancamentos) {
  return lancamentos.some((lancamento) => {
    const observacoes = String(lancamento.observacoes || '').toLowerCase();
    const descricao = String(lancamento.descricao || '').toLowerCase();
    const vinculado = lancamento.pedido_compra_vinculado_id === pedido.id || lancamento.referencia_id === pedido.id;
    const mencionaOrfaos = observacoes.includes('itens órfãos') || observacoes.includes('itens orfaos') || descricao.includes('não entregues') || descricao.includes('nao entregues');
    const statusValido = ['Em Aberto', 'Pago'].includes(lancamento.status);
    return vinculado && mencionaOrfaos && statusValido;
  });
}

function calcularStatus(pedido, lancamentos) {
  const resumoItens = calcularResumoItensPedido(pedido);
  const itensComPendencia = resumoItens.filter((item) => item.quantidade_recebida < item.quantidade_pedida);
  const temPendenciaFisica = itensComPendencia.length > 0;
  const temDivergencia = (pedido.embarques_registrados || []).some((embarque) =>
    (embarque.itens_embarcados || []).some((item) => item.divergencia_tipo && item.divergencia_tipo !== 'Nenhuma')
  );
  const pendenciaResolvidaFinanceiramente = temPendenciaFisica && calcularPendenciasResolvidasFinanceiramente(pedido, lancamentos);

  let status = pedido.status;
  let statusRecebimento = 'Pendente';

  if (!temPendenciaFisica) {
    status = 'Concluído';
    statusRecebimento = temDivergencia ? 'Concluído com Divergência' : 'Concluído OK';
  } else if (pendenciaResolvidaFinanceiramente) {
    status = 'Concluído';
    statusRecebimento = 'Concluído com Divergência';
  } else if ((pedido.embarques_registrados || []).length > 0) {
    status = temDivergencia ? 'Pendência' : 'Em Conferência';
    statusRecebimento = 'Recebido Parcial';
  }

  return {
    status,
    status_recebimento_geral: statusRecebimento,
    tem_divergencias: temDivergencia || (temPendenciaFisica && !pendenciaResolvidaFinanceiramente),
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
    let atualizados = 0;
    const erros = [];

    for (const pedido of pedidos) {
      try {
        const lancamentos = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({ pedido_compra_vinculado_id: pedido.id });
        const proximo = calcularStatus(pedido, lancamentos);

        const mudou =
          pedido.status !== proximo.status ||
          pedido.status_recebimento_geral !== proximo.status_recebimento_geral ||
          Boolean(pedido.tem_divergencias) !== Boolean(proximo.tem_divergencias);

        if (mudou) {
          await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, {
            ...proximo,
            historico: `${pedido.historico || ''}\n[REPROCESSAMENTO CONCLUSAO | status=${proximo.status} | recebimento=${proximo.status_recebimento_geral}]`,
          });
          atualizados += 1;
        }
      } catch (error) {
        erros.push({ pedido_id: pedido.id, error: error.message });
      }
    }

    return Response.json({ success: true, total: pedidos.length, atualizados, erros });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});