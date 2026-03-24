import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const skip = body.skip || 0;
    const batchSize = 30;
    // Modo "forcar" = recalcula mesmo se parecer correto, baseado em valor_compra > 0 e custo = 0
    const forcar = body.forcar === true;

    const produtos = await base44.asServiceRole.entities.Produto.filter({}, '-created_date', batchSize, skip);
    
    let corrigidos = 0;
    let jaCorretos = 0;
    const detalhes = [];

    for (const p of produtos) {
      const valorCompra = p.valor_compra || 0;
      const frete = p.custo_frete_padrao || 0;
      const imp1 = p.custo_imposto1_padrao || 0;
      const imp2 = p.custo_imposto2_padrao || 0;
      const outros = p.custo_outros_padrao || 0;
      const desconto = p.desconto_compra_padrao || 0;
      
      const custoRecalculado = valorCompra + frete + imp1 + imp2 + outros - desconto;
      const custoAtual = p.preco_custo_calculado || 0;
      
      // Condição de correção:
      // 1. Normal: custo recalculado difere do atual
      // 2. Forçado: valor_compra > 0 mas custo calculado = 0 (dados que nunca foram consolidados)
      const precisaCorrigir = Math.abs(custoRecalculado - custoAtual) > 0.01;
      const custoZeradoComValor = forcar && valorCompra > 0 && custoAtual === 0;
      
      if (precisaCorrigir || custoZeradoComValor) {
        const custoFinal = custoRecalculado > 0 ? custoRecalculado : valorCompra;
        const update = { preco_custo_calculado: custoFinal };
        
        // Recalcular preço de venda se tipo percentual
        if (p.preco_venda_tipo === 'percentual' && custoFinal > 0) {
          const markup = p.preco_venda_percentual || 40;
          update.preco_venda_padrao = parseFloat((custoFinal * (1 + markup / 100)).toFixed(2));
        }
        
        await base44.asServiceRole.entities.Produto.update(p.id, update);
        corrigidos++;
        detalhes.push({
          nome: p.nome,
          valorCompra,
          custoAnterior: custoAtual,
          custoNovo: custoFinal,
          precoVendaNovo: update.preco_venda_padrao || p.preco_venda_padrao,
        });

        await sleep(300);
      } else {
        jaCorretos++;
      }
    }

    return Response.json({
      success: true,
      loteAtual: skip,
      processadosNesteLote: produtos.length,
      corrigidos,
      jaCorretos,
      proximoSkip: produtos.length === batchSize ? skip + batchSize : null,
      detalhes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});