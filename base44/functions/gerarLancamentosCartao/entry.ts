import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Rotina separada: processa apenas entidades PagamentoCartaoDetalhe (pipeline legado/paralelo).
 * Vendas feitas pelo PDV via processarVendaCaixa já geram LancamentoFinanceiro de cartão diretamente;
 * não inserir PagamentoCartaoDetalhe a partir desse fluxo para evitar lançamentos duplicados.
 */

// Retorna próximo dia útil (pula sábado e domingo)
function proximoDiaUtil(dataBase, dias) {
  const d = new Date(dataBase);
  d.setDate(d.getDate() + dias);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const dataOntem = ontem.toISOString().split('T')[0];

    // Busca detalhes de cartão pendentes do dia anterior
    const pendentes = await base44.asServiceRole.entities.PagamentoCartaoDetalhe.filter({
      data_venda: dataOntem,
      status_conciliacao: 'Pendente'
    });

    if (pendentes.length === 0) {
      return Response.json({ message: 'Nenhum pagamento pendente para processar', total: 0 });
    }

    // Busca categoria financeira para taxas de maquininha
    const categorias = await base44.asServiceRole.entities.CategoriaFinanceira.list();
    const catMaquininha = categorias.find(c =>
      c.nome?.toLowerCase().includes('maquininha') ||
      c.nome?.toLowerCase().includes('adquirente')
    );

    let lancamentosGerados = 0;
    const erros = [];

    for (const pgto of pendentes) {
      try {
        // Busca dados da maquininha para prazos de recebimento
        const maquininha = await base44.asServiceRole.entities.Maquininha.get(pgto.maquininha_id);
        if (!maquininha) continue;

        // Todas as modalidades: próximo dia útil (D+1; sexta–domingo → segunda)
        const prazoDias = 1;

        const dataLiquidacao = proximoDiaUtil(pgto.data_venda, prazoDias);

        // 1. Lançamento RECEITA — valor líquido a receber
        const lancamentoReceita = await base44.asServiceRole.entities.LancamentoFinanceiro.create({
          tipo: 'Receita',
          descricao: `Venda Cartão ${pgto.modalidade} ${pgto.bandeira} ${pgto.parcelas > 1 ? pgto.parcelas + 'x' : ''} — ${pgto.maquininha_nome} — Pedido ${pgto.pedido_numero || pgto.pedido_venda_id}`,
          valor: pgto.valor_bruto,
          valor_liquido: pgto.valor_liquido,
          conta_financeira_id: pgto.conta_destino_id || maquininha.conta_destino_id,
          conta_financeira_nome: pgto.maquininha_nome,
          forma_pagamento: `${pgto.modalidade} ${pgto.bandeira}`,
          forma_pagamento_tipo: pgto.modalidade === 'Débito' ? 'Cartão Débito' : 'Cartão Crédito',
          data_vencimento: dataLiquidacao,
          data_liquidacao_prevista: dataLiquidacao,
          referencia_id: pgto.pedido_venda_id,
          referencia_tipo: 'PedidoVenda',
          referencia_numero: pgto.pedido_numero,
          status: 'Em Aberto',
          status_conciliacao: 'Pendente',
          tags: ['cartao', pgto.adquirente?.toLowerCase() || '', pgto.bandeira?.toLowerCase() || '']
        });

        // 2. Lançamento DESPESA — taxa da maquininha (se houver)
        if (pgto.valor_taxa_total > 0) {
          await base44.asServiceRole.entities.LancamentoFinanceiro.create({
            tipo: 'Despesa',
            descricao: `Taxa Maquininha ${pgto.maquininha_nome} — ${pgto.taxa_total_percentual?.toFixed(2)}% — ${pgto.bandeira} ${pgto.modalidade}`,
            valor: pgto.valor_taxa_total,
            valor_liquido: pgto.valor_taxa_total,
            conta_financeira_id: pgto.conta_destino_id || maquininha.conta_destino_id,
            conta_financeira_nome: pgto.maquininha_nome,
            categoria: catMaquininha?.nome || 'Custos de Maquininha',
            categoria_id: catMaquininha?.id,
            data_vencimento: dataLiquidacao,
            referencia_id: pgto.pedido_venda_id,
            referencia_tipo: 'PedidoVenda',
            referencia_numero: pgto.pedido_numero,
            status: 'Em Aberto',
            tags: ['taxa-maquininha', pgto.adquirente?.toLowerCase() || '']
          });
        }

        // Atualiza o detalhe do cartão com o lançamento gerado
        await base44.asServiceRole.entities.PagamentoCartaoDetalhe.update(pgto.id, {
          lancamento_financeiro_id: lancamentoReceita.id,
          status_conciliacao: 'Lançamento Gerado'
        });

        lancamentosGerados++;
      } catch (err) {
        erros.push({ id: pgto.id, erro: err.message });
      }
    }

    return Response.json({
      message: `Processados ${lancamentosGerados} de ${pendentes.length} pagamentos`,
      lancamentosGerados,
      erros
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});