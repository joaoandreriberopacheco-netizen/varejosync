import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Calcula o próximo dia útil (pula sábado e domingo)
 */
function proximoDiaUtil(data, diasParaAdicionar) {
  const d = new Date(data);
  let diasAdicionados = 0;
  while (diasAdicionados < diasParaAdicionar) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) diasAdicionados++;
  }
  return d.toISOString().split('T')[0];
}

function toDateStr(d) {
  return new Date(d).toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const hoje = new Date();
    // Processa pagamentos com status "Pendente" até hoje
    const pendentes = await base44.asServiceRole.entities.PagamentoCartaoDetalhe.filter({
      status_conciliacao: 'Pendente'
    });

    if (pendentes.length === 0) {
      return Response.json({ ok: true, processados: 0, mensagem: 'Nenhum pagamento pendente encontrado.' });
    }

    // Busca categorias financeiras
    const categorias = await base44.asServiceRole.entities.CategoriaFinanceira.list();
    const catReceita = categorias.find(c =>
      c.nome?.toLowerCase().includes('vend') || c.tipo === 'Receita'
    );
    const catTaxa = categorias.find(c =>
      c.nome?.toLowerCase().includes('maquin') ||
      c.nome?.toLowerCase().includes('taxa') ||
      c.nome?.toLowerCase().includes('adquir')
    );

    let processados = 0;
    let erros = 0;

    for (const pag of pendentes) {
      try {
        const dataLiquidacao = proximoDiaUtil(
          pag.data_venda || toDateStr(pag.created_date),
          pag.prazo_recebimento_dias || 1
        );

        // 1. Lançamento de RECEITA (valor líquido)
        const lancamentoReceita = await base44.asServiceRole.entities.LancamentoFinanceiro.create({
          tipo: 'Receita',
          descricao: `Recebimento cartão ${pag.bandeira} ${pag.modalidade}${pag.parcelas > 1 ? ` ${pag.parcelas}x` : ''} — Pedido ${pag.pedido_numero || pag.pedido_venda_id}`,
          valor: pag.valor_bruto,
          valor_liquido: pag.valor_liquido_recebido,
          data_vencimento: dataLiquidacao,
          data_liquidacao_prevista: dataLiquidacao,
          status: 'Em Aberto',
          status_conciliacao: 'Pendente',
          conta_financeira_id: pag.conta_destino_id,
          conta_financeira_nome: pag.conta_destino_nome,
          forma_pagamento: `${pag.bandeira} ${pag.modalidade}`,
          forma_pagamento_tipo: pag.modalidade === 'Débito' ? 'Cartão Débito' : 'Cartão Crédito',
          categoria_id: catReceita?.id || null,
          categoria: catReceita?.nome || 'Vendas',
          referencia_id: pag.pedido_venda_id,
          referencia_tipo: 'PedidoVenda',
          referencia_numero: pag.pedido_numero,
          observacoes: `Maquininha: ${pag.maquininha_nome || pag.adquirente} | Taxa total: ${pag.taxa_total_percentual?.toFixed(2)}% = R$ ${pag.valor_taxa_total?.toFixed(2)}`
        });

        // 2. Lançamento de DESPESA (taxa da maquininha)
        const lancamentoTaxa = await base44.asServiceRole.entities.LancamentoFinanceiro.create({
          tipo: 'Despesa',
          descricao: `Taxa maquininha ${pag.adquirente || pag.maquininha_nome} (${pag.bandeira} ${pag.modalidade}${pag.parcelas > 1 ? ` ${pag.parcelas}x` : ''})`,
          valor: pag.valor_taxa_total,
          valor_liquido: pag.valor_taxa_total,
          data_vencimento: dataLiquidacao,
          data_liquidacao_prevista: dataLiquidacao,
          status: 'Em Aberto',
          status_conciliacao: 'Pendente',
          conta_financeira_id: pag.conta_destino_id,
          conta_financeira_nome: pag.conta_destino_nome,
          forma_pagamento: `${pag.bandeira} ${pag.modalidade}`,
          forma_pagamento_tipo: pag.modalidade === 'Débito' ? 'Cartão Débito' : 'Cartão Crédito',
          categoria_id: catTaxa?.id || null,
          categoria: catTaxa?.nome || 'Custos de Maquininha',
          referencia_id: pag.pedido_venda_id,
          referencia_tipo: 'PedidoVenda',
          referencia_numero: pag.pedido_numero,
          observacoes: `Intermediação: ${pag.taxa_intermediacao_percentual?.toFixed(2)}% | Parcelamento: ${pag.taxa_parcelamento_percentual?.toFixed(2)}%`
        });

        // 3. Atualizar o PagamentoCartaoDetalhe
        await base44.asServiceRole.entities.PagamentoCartaoDetalhe.update(pag.id, {
          lancamento_financeiro_id: lancamentoReceita.id,
          lancamento_taxa_id: lancamentoTaxa.id,
          data_liquidacao_prevista: dataLiquidacao,
          status_conciliacao: 'Lançado'
        });

        processados++;
      } catch (err) {
        console.error(`Erro ao processar PagamentoCartaoDetalhe ${pag.id}:`, err.message);
        await base44.asServiceRole.entities.PagamentoCartaoDetalhe.update(pag.id, {
          status_conciliacao: 'Erro'
        });
        erros++;
      }
    }

    return Response.json({
      ok: true,
      processados,
      erros,
      mensagem: `${processados} lançamento(s) gerado(s) com sucesso.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});