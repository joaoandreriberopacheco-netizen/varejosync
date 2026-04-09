import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function calcularSaldo(movimentacoes) {
  return (movimentacoes || []).reduce((acc, mov) => {
    const quantidade = Number(mov.quantidade) || 0;
    if (mov.tipo === 'Entrada') return acc + quantidade;
    if (mov.tipo === 'Saída') return acc - quantidade;
    return acc;
  }, 0);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { skip = 0, limit = 25 } = await req.json();
    const produtos = await base44.asServiceRole.entities.Produto.list('', limit, skip);

    let atualizados = 0;
    const divergencias = [];

    for (const produto of produtos) {
      const movimentosProduto = await base44.asServiceRole.entities.MovimentacaoEstoque.filter({ produto_id: produto.id }, '-created_date', 1000);
      const saldoMovimentos = calcularSaldo(movimentosProduto);
      const estoqueAvariado = Number(produto.estoque_avariado) || 0;
      const estoqueCorreto = Math.max(0, saldoMovimentos - estoqueAvariado);
      const estoqueAtual = Number(produto.estoque_atual) || 0;

      if (estoqueAtual !== estoqueCorreto) {
        await base44.asServiceRole.entities.Produto.update(produto.id, {
          estoque_atual: estoqueCorreto,
        });
        atualizados += 1;
        divergencias.push({
          produto_id: produto.id,
          produto_nome: produto.nome,
          estoque_anterior: estoqueAtual,
          estoque_correto: estoqueCorreto,
          movimentos: movimentosProduto.length,
        });
      }
    }

    return Response.json({
      success: true,
      skip,
      limit,
      processados: produtos.length,
      atualizados,
      divergencias,
      proximo_skip: skip + produtos.length,
      terminou: produtos.length < limit,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});