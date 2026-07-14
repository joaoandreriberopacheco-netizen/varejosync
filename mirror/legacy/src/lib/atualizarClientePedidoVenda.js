export async function atualizarClientePedidoVenda(base44, pedido, cliente, usuario = null) {
  if (!pedido?.id) {
    throw new Error('Pedido inválido para alteração de cliente.');
  }
  if (!cliente?.id || !cliente?.nome) {
    throw new Error('Cliente inválido para alteração.');
  }

  const agora = new Date().toISOString();
  const clienteAnteriorNome = pedido?.cliente_nome || 'Não informado';
  const linhaHistorico =
    `\n[Correção de cliente | ${agora}${usuario?.full_name ? ` | Por: ${usuario.full_name}` : ''}]` +
    `\nAntes: ${clienteAnteriorNome}` +
    `\nDepois: ${cliente.nome}`;

  await base44.entities.PedidoVenda.update(pedido.id, {
    cliente_id: cliente.id,
    cliente_nome: cliente.nome,
    historico: (pedido.historico || '') + linhaHistorico,
  });

  const lancamentos = await base44.entities.LancamentoFinanceiro.filter({
    referencia_id: pedido.id,
    referencia_tipo: 'PedidoVenda',
  });

  const numeroPedido = pedido?.numero || '';
  const descricaoFiado = `Fiado - Venda ${numeroPedido}${cliente.nome ? ` - ${cliente.nome}` : ''}`;
  const descricaoVenda = `Venda ${numeroPedido}${cliente.nome ? ` - ${cliente.nome}` : ''}`;

  for (const lanc of lancamentos) {
    const descricaoAtual = lanc?.descricao || '';
    const payload = {
      terceiro_id: cliente.id,
      terceiro_nome: cliente.nome,
    };

    if (
      lanc?.forma_pagamento === 'Conta a Pagar' ||
      descricaoAtual.startsWith(`Fiado - Venda ${numeroPedido}`)
    ) {
      payload.descricao = descricaoFiado;
    } else if (descricaoAtual.startsWith(`Venda ${numeroPedido}`)) {
      payload.descricao = descricaoVenda;
    }

    await base44.entities.LancamentoFinanceiro.update(lanc.id, payload);
  }

  return {
    lancamentosAtualizados: lancamentos.length,
  };
}
