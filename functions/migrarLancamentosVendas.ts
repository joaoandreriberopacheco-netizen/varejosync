import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Migração única: cria LancamentoFinanceiro para todas as PedidoVenda
 * que foram processadas (status != Orçamento/Cancelado) e ainda não têm lançamento.
 * Só pode ser executado por admin.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Acesso negado. Apenas admins.' }, { status: 403 });
  }

  const svc = base44.asServiceRole;

  // Buscar todos os pedidos de venda já processados (excluir Orçamento e Cancelado)
  const pedidos = await svc.entities.PedidoVenda.list();
  const pedidosValidos = pedidos.filter(p =>
    p.status !== 'Orçamento' && p.status !== 'Cancelado' && p.pagamentos?.length > 0
  );

  // Buscar lançamentos existentes para identificar quais já foram migrados
  const lancamentos = await svc.entities.LancamentoFinanceiro.filter({ referencia_tipo: 'PedidoVenda' });
  const pedidosComLancamento = new Set(lancamentos.map(l => l.referencia_id));

  // Buscar contas financeiras e formas de pagamento para lookup
  const [contas, formas] = await Promise.all([
    svc.entities.ContasFinanceiras.filter({ ativo: true }),
    svc.entities.FormasDePagamento.list(),
  ]);

  const contaMap = {};
  contas.forEach(c => { contaMap[c.id] = c; });

  const formaMap = {};
  formas.forEach(f => { formaMap[f.nome] = f; });

  // Encontrar conta caixa geral como fallback
  const contaCaixaGeral = contas.find(c => c.is_caixa_geral) || contas[0];

  let criados = 0;
  let ignorados = 0;
  const erros = [];

  for (const pedido of pedidosValidos) {
    // Já tem lançamento? Pular
    if (pedidosComLancamento.has(pedido.id)) {
      ignorados++;
      continue;
    }

    for (const pag of (pedido.pagamentos || [])) {
      if (!pag.valor || pag.valor <= 0) continue;
      if (pag.forma_pagamento === 'Vale Troca') continue;

      try {
        const forma = formaMap[pag.forma_pagamento];
        const contaDestinoId = forma?.conta_destino_id || contaCaixaGeral?.id;
        const contaDestinoNome = forma?.conta_destino_nome || pag.forma_pagamento || 'Caixa';
        const formaPgId = forma?.id || null;

        // Data: usa created_date do pedido
        const dataRef = pedido.created_date
          ? new Date(pedido.created_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        await svc.entities.LancamentoFinanceiro.create({
          tipo: 'Receita',
          descricao: `Venda ${pedido.numero}${pedido.cliente_nome ? ` - ${pedido.cliente_nome}` : ''}`,
          terceiro_id: pedido.cliente_id || null,
          terceiro_nome: pedido.cliente_nome || null,
          valor: pag.valor,
          valor_liquido: pag.valor_liquido_recebido || pag.valor,
          data_vencimento: dataRef,
          data_pagamento: dataRef,
          status: 'Pago',
          status_conciliacao: pag.forma_pagamento === 'Dinheiro' ? 'N/A' : 'Pendente',
          forma_pagamento: pag.forma_pagamento,
          forma_pagamento_id: formaPgId,
          forma_pagamento_tipo: pag.forma_pagamento,
          categoria: 'Venda de Produto',
          conta_financeira_id: contaDestinoId,
          conta_financeira_nome: contaDestinoNome,
          turno_caixa_id: pedido.turno_caixa_id || null,
          referencia_id: pedido.id,
          referencia_tipo: 'PedidoVenda',
          referencia_numero: pedido.numero,
        });

        criados++;
      } catch (err) {
        erros.push(`Pedido ${pedido.numero} (${pag.forma_pagamento}): ${err.message}`);
      }
    }
  }

  return Response.json({
    success: true,
    pedidos_processados: pedidosValidos.length,
    pedidos_ja_migrados: ignorados,
    lancamentos_criados: criados,
    erros: erros.length > 0 ? erros : undefined,
  });
});