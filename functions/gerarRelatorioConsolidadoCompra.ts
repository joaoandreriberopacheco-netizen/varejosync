import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pedido_id } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'Missing pedido_id' }, { status: 400 });
    }

    // Buscar pedido de compra
    const pedido = await base44.asServiceRole.entities.PedidoCompra.get(pedido_id);
    
    // Buscar configuração de custos (se existir)
    const configs = await base44.asServiceRole.entities.ConfiguracoesEstoque.list();
    const config = configs.length > 0 ? configs[0] : null;

    // Buscar dados de cada produto
    const itensConsolidados = await Promise.all(
      (pedido.itens || []).map(async (item) => {
        const produto = await base44.asServiceRole.entities.Produto.get(item.produto_id);
        
        // Calcular custos
        const custoImposto1 = produto.custo_imposto1_padrao || 0;
        const custoImposto2 = produto.custo_imposto2_padrao || 0;
        const custoOutros = produto.custo_outros_padrao || 0;
        const custoCalculado = produto.preco_custo_calculado || 0;
        
        // Variação de preços
        const precoVendaAnterior = produto.preco_venda_anterior || produto.preco_venda_padrao;
        const variacaoPrecoVenda = precoVendaAnterior > 0 
          ? ((produto.preco_venda_padrao - precoVendaAnterior) / precoVendaAnterior) * 100 
          : 0;
        
        const variacaoCusto = custoCalculado > 0
          ? ((custoCalculado - item.custo_unitario) / item.custo_unitario) * 100
          : 0;

        return {
          // Seção Compra
          id_produto: produto.id,
          nome_produto: produto.nome,
          quantidade: item.quantidade,
          valor_unitario_compra: item.custo_unitario,
          desconto_compra: produto.desconto_compra_padrao || 0,
          valor_total_item: item.total,
          
          // Seção Precificação
          preco_compra_atual: produto.valor_compra,
          custo_imposto1: custoImposto1,
          custo_imposto2: custoImposto2,
          custo_outros: custoOutros,
          nome_custo1: config?.nome_custo_1 || 'Imposto 1',
          nome_custo2: config?.nome_custo_2 || 'Imposto 2',
          nome_custo3: config?.nome_custo_3 || 'Outros',
          
          // Cálculos
          custo_calculado: custoCalculado,
          variacao_custo_pct: variacaoCusto,
          preco_venda_atual: produto.preco_venda_padrao,
          preco_venda_anterior: precoVendaAnterior,
          variacao_preco_venda_pct: variacaoPrecoVenda
        };
      })
    );

    return Response.json({
      pedido: {
        id: pedido.id,
        numero: pedido.numero,
        fornecedor_nome: pedido.fornecedor_nome,
        data_prevista_entrega: pedido.data_prevista_entrega,
        status: pedido.status,
        valor_total: pedido.valor_total,
        created_date: pedido.created_date
      },
      itens_consolidados: itensConsolidados
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});