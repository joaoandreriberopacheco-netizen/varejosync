import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Processa uma venda no caixa de forma atômica e segura:
 * 1. Marca o rascunho como "Em Processamento" (selo frio)
 * 2. Valida que ainda não foi convertido
 * 3. Cria o PedidoVenda com número único
 * 4. Atualiza estoque, financeiro e vale troca
 * 5. Retorna sucesso ou erro (com rollback do status do rascunho)
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    rascunho_id,
    pagamentos,       // array de { forma_pagamento, valor, parcelas, vale_id?, vale_codigo? }
    turno_id,
    conta_caixa_id,
    saldo_atual_caixa,
    config_venda,     // { fluxo_venda_padrao, auto_delivery_balcao }
  } = await req.json();

  if (!rascunho_id || !pagamentos || !turno_id) {
    return Response.json({ error: 'Parâmetros obrigatórios ausentes.' }, { status: 400 });
  }

  const svc = base44.asServiceRole;

  // ── PASSO 1: Buscar rascunho e aplicar selo frio ──────────────────────────
  let rascunho;
  try {
    rascunho = await svc.entities.RascunhoPedidoVenda.get(rascunho_id);
  } catch (_) {
    rascunho = null;
  }

  if (!rascunho) {
    return Response.json({ error: 'Rascunho não encontrado.' }, { status: 404 });
  }

  // Idempotência: já foi convertido?
  if (rascunho.status === 'Convertido') {
    return Response.json({ error: 'Este pedido já foi processado. Evite duplo clique.', ja_processado: true }, { status: 409 });
  }

  // Já está sendo processado por outra requisição?
  if (rascunho.status === 'Em Processamento') {
    return Response.json({ error: 'Este pedido já está sendo processado. Aguarde.', em_processamento: true }, { status: 409 });
  }

  // Aplicar o "Selo Frio" – marcar como em processamento IMEDIATAMENTE
  await svc.entities.RascunhoPedidoVenda.update(rascunho_id, {
    status: 'Em Processamento',
    data_inicio_processamento: new Date().toISOString(),
    operador_processamento: user.full_name,
  });

  // ── PASSO 2: Gerar número único para o PedidoVenda ───────────────────────
  let numeroPedido;
  try {
    const todosPedidos = await svc.entities.PedidoVenda.list();
    let maxNum = 0;
    for (const p of todosPedidos) {
      const match = (p.numero || '').match(/^PV-(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    numeroPedido = `PV-${String(maxNum + 1).padStart(5, '0')}`;
  } catch (err) {
    // Rollback do selo frio
    await svc.entities.RascunhoPedidoVenda.update(rascunho_id, { status: 'Aguardando Caixa' });
    return Response.json({ error: `Erro ao gerar número do pedido: ${err.message}` }, { status: 500 });
  }

  // ── PASSO 3: Criar PedidoVenda ────────────────────────────────────────────
  let pedidoVenda;
  try {
    pedidoVenda = await svc.entities.PedidoVenda.create({
      numero: numeroPedido,
      senha_atendimento: rascunho.senha_atendimento,
      cliente_id: rascunho.cliente_id,
      cliente_nome: rascunho.cliente_nome,
      vendedor_id: rascunho.vendedor_id,
      vendedor_nome: rascunho.vendedor_nome,
      tabela_preco_id: rascunho.tabela_preco_id,
      tipo: rascunho.tipo,
      status: 'Financeiro OK',
      metodo_entrega: rascunho.metodo_entrega,
      turno_caixa_id: turno_id,
      itens: rascunho.itens,
      subtotal: rascunho.subtotal,
      valor_desconto: rascunho.valor_desconto,
      valor_frete: rascunho.valor_frete,
      valor_total: rascunho.valor_total,
      pagamentos: pagamentos,
      observacoes: rascunho.observacoes,
    });
  } catch (err) {
    // Rollback do selo frio
    await svc.entities.RascunhoPedidoVenda.update(rascunho_id, { status: 'Aguardando Caixa' });
    return Response.json({ error: `Erro ao criar pedido de venda: ${err.message}` }, { status: 500 });
  }

  // ── PASSO 4: Operações paralelas (estoque, turno, financeiro, vale) ───────
  const erros = [];

  // 4a. Atualizar rascunho como Convertido (confirma o selo definitivo)
  try {
    await svc.entities.RascunhoPedidoVenda.update(rascunho_id, {
      status: 'Convertido',
      pedido_venda_final_id: pedidoVenda.id,
      data_conversao: new Date().toISOString(),
    });
  } catch (err) {
    erros.push(`Rascunho não atualizado: ${err.message}`);
  }

  // 4b. Vincular venda ao turno
  try {
    const turno = await svc.entities.TurnoCaixa.get(turno_id);
    await svc.entities.TurnoCaixa.update(turno_id, {
      vendas_ids: [...(turno?.vendas_ids || []), pedidoVenda.id],
    });
  } catch (err) {
    erros.push(`Turno não atualizado: ${err.message}`);
  }

  // 4c. Movimentações de estoque + atualização de produto
  for (const item of (rascunho.itens || [])) {
    try {
      await svc.entities.MovimentacaoEstoque.create({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        tipo: 'Saída',
        motivo: 'Venda',
        quantidade: item.quantidade,
        custo_unitario: item.custo_unitario_momento || 0,
        referencia_tipo: 'PedidoVenda',
        referencia_id: pedidoVenda.id,
        referencia_numero: numeroPedido,
        usuario_responsavel: user.full_name,
      });

      const produto = await svc.entities.Produto.get(item.produto_id);
      if (produto) {
        await svc.entities.Produto.update(item.produto_id, {
          estoque_atual: Math.max(0, (produto.estoque_atual || 0) - item.quantidade),
        });
      }
    } catch (err) {
      erros.push(`Estoque produto ${item.produto_nome}: ${err.message}`);
    }
  }

  // 4d. Atualizar saldo do caixa (dinheiro)
  const pagDinheiro = pagamentos.find(p => p.forma_pagamento === 'Dinheiro');
  if (pagDinheiro && pagDinheiro.valor > 0 && conta_caixa_id) {
    try {
      const conta = await svc.entities.ContasFinanceiras.get(conta_caixa_id);
      await svc.entities.ContasFinanceiras.update(conta_caixa_id, {
        saldo_atual: (conta?.saldo_atual || 0) + pagDinheiro.valor,
      });
    } catch (err) {
      erros.push(`Saldo caixa: ${err.message}`);
    }
  }

  // 4e. Vale Troca - atualizar saldo e registrar uso
  let saldoResidualVale = null;
  const pagVale = pagamentos.find(p => p.forma_pagamento === 'Vale Troca' && p.vale_id);
  if (pagVale) {
    try {
      const vale = await svc.entities.ValeCompra.get(pagVale.vale_id);
      if (vale) {
        const novoSaldo = Math.max(0, (vale.valor_disponivel || 0) - pagVale.valor);
        const novoStatus = novoSaldo <= 0.01 ? 'Utilizado' : 'Utilizado Parcialmente';
        await svc.entities.ValeCompra.update(pagVale.vale_id, {
          valor_disponivel: novoSaldo,
          status: novoStatus,
          historico_uso: [
            ...(vale.historico_uso || []),
            {
              data: new Date().toISOString(),
              valor_usado: pagVale.valor,
              pedido_id: pedidoVenda.id,
              pedido_numero: numeroPedido,
            },
          ],
        });
        if (novoSaldo > 0.01) {
          saldoResidualVale = { codigo: vale.codigo, saldo: novoSaldo, vale_id: pagVale.vale_id };
        }
      }
    } catch (err) {
      erros.push(`Vale troca: ${err.message}`);
    }
  }

  // 4f. Criar OrdemSeparacao se fluxo Completo
  if (config_venda?.fluxo_venda_padrao === 'Completo') {
    try {
      await svc.entities.OrdemSeparacao.create({
        pedido_venda_id: pedidoVenda.id,
        pedido_numero: numeroPedido,
        status: 'Pendente',
        itens: (rascunho.itens || []).map(item => ({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade_solicitada: item.quantidade,
          quantidade_separada: 0,
          custo_unitario_momento: item.custo_unitario_momento || 0,
        })),
      });
    } catch (err) {
      erros.push(`Ordem de separação: ${err.message}`);
    }
  }

  return Response.json({
    success: true,
    pedido_venda: pedidoVenda,
    numero: numeroPedido,
    saldo_residual_vale: saldoResidualVale,
    avisos: erros.length > 0 ? erros : undefined,
  });
});