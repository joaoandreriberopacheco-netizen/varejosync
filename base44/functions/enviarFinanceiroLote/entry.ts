import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const dataHojeFormatado = () => {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Rio_Branco',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

const addDaysToDateString = (dateString, days) => {
  const base = new Date(`${dateString}T12:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pedidos, formaPagamento, dataPrimeiroVencimento } = await req.json();

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      return Response.json({ error: 'Nenhum pedido informado' }, { status: 400 });
    }

    const contasFinanceiras = await base44.entities.ContasFinanceiras.list();
    const contaPadrao = contasFinanceiras.find((conta) => conta.ativo && conta.is_caixa_geral)
      || contasFinanceiras.find((conta) => conta.ativo);

    if (!contaPadrao?.id) {
      return Response.json({ error: 'Nenhuma conta financeira ativa foi encontrada para registrar o lançamento' }, { status: 400 });
    }

    for (const pedido of pedidos) {
      const valorTotal = Number(pedido.valor_total) || 0;
      const formaAtual = formaPagamento || 'Parcelado';
      const vencimentoBase = dataPrimeiroVencimento || dataHojeFormatado();

      const baseLancamento = {
        tipo: 'Despesa',
        descricao: `Compra de Mercadoria - ${pedido.numero}`,
        terceiro_id: pedido.fornecedor_id,
        terceiro_nome: pedido.fornecedor_nome,
        valor: valorTotal,
        status: 'Em Aberto',
        categoria: 'Compra de Mercadoria',
        conta_financeira_id: pedido.conta_pagamento_id || contaPadrao.id,
        conta_financeira_nome: pedido.conta_pagamento_nome || contaPadrao.nome,
        referencia_id: pedido.id,
        referencia_tipo: 'PedidoCompra',
        referencia_numero: pedido.numero,
        is_custo_mercadoria: true,
        pedido_compra_vinculado_id: pedido.id,
        pedido_compra_vinculado_numero: pedido.numero,
      };

      if (formaAtual === 'À Vista') {
        await base44.entities.LancamentoFinanceiro.create({
          ...baseLancamento,
          descricao: `Compra de Mercadoria - ${pedido.numero} (À Vista)`,
          data_vencimento: vencimentoBase,
          observacoes: 'Pagamento à vista. Aguardando aprovação do financeiro.',
        });
      } else {
        const numParcelas = Number(pedido.num_parcelas) || 1;
        const valorParcela = valorTotal / numParcelas;
        const intervalo = Number(pedido.intervalo_parcelas_dias) || 30;

        for (let i = 0; i < numParcelas; i++) {
          await base44.entities.LancamentoFinanceiro.create({
            ...baseLancamento,
            descricao: `Compra de Mercadoria - ${pedido.numero} (${i + 1}/${numParcelas})`,
            valor: valorParcela,
            data_vencimento: addDaysToDateString(vencimentoBase, i * intervalo),
            observacoes: `Parcela ${i + 1} de ${numParcelas}. Aguardando aprovação do financeiro.`,
            is_recorrente: numParcelas > 1,
            frequencia_recorrencia: numParcelas > 1 ? 'Parcelado' : undefined,
            numero_parcelas_total: numParcelas > 1 ? numParcelas : undefined,
            parcela_atual: numParcelas > 1 ? i + 1 : undefined,
          });
        }
      }

      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Aguardando Liberação',
        status_aprovacao_financeira: 'Aguardando Aprovação Financeira',
      });

      await base44.entities.Tarefa.create({
        titulo: `Aguardando Manifesto/NF - ${pedido.numero}`,
        tipo: 'Aguardando Manifesto/NF',
        status: 'Pendente',
        prioridade: 'Alta',
        responsavel_id: user.id,
        responsavel_nome: user.full_name,
        referencia_tipo: 'PedidoCompra',
        referencia_id: pedido.id,
        referencia_numero: pedido.numero,
        valor_pendente: valorTotal,
        descricao: `Aguardando recebimento de NF/Manifesto do fornecedor ${pedido.fornecedor_nome} para programar a recepção.`,
        data_vencimento: pedido.data_prevista_entrega ? String(pedido.data_prevista_entrega).slice(0, 10) : dataHojeFormatado(),
      });
    }

    return Response.json({ success: true, quantidade: pedidos.length });
  } catch (error) {
    console.error('Erro ao enviar pedidos em lote:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});