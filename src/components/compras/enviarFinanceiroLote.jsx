import { base44 } from '@/api/base44Client';
import { addDays, format } from 'date-fns';

const dataHojeFormatado = () => {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Rio_Branco',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
};

export default async function enviarFinanceiroLote({ pedidos, currentUser }) {
  for (const pedido of pedidos) {
    const valorTotal = Number(pedido.valor_total) || 0;

    const baseLancamento = {
      tipo: 'Despesa',
      terceiro_id: pedido.fornecedor_id,
      terceiro_nome: pedido.fornecedor_nome,
      status: 'Em Aberto',
      categoria: 'Compra de Mercadoria',
      referencia_id: pedido.id,
      referencia_tipo: 'PedidoCompra',
      referencia_numero: pedido.numero,
      is_custo_mercadoria: true,
      pedido_compra_vinculado_id: pedido.id,
      pedido_compra_vinculado_numero: pedido.numero,
    };

    if ((pedido.forma_pagamento_compra || 'Parcelado') === 'À Vista') {
      await base44.entities.LancamentoFinanceiro.create({
        ...baseLancamento,
        descricao: `Compra de Mercadoria - ${pedido.numero} (À Vista)`,
        valor: valorTotal,
        data_vencimento: pedido.data_primeiro_vencimento || dataHojeFormatado(),
        observacoes: 'Pagamento à vista. Aguardando aprovação do financeiro.',
      });
    } else {
      const numParcelas = pedido.num_parcelas || 1;
      const valorParcela = valorTotal / numParcelas;
      const dataBase = pedido.data_primeiro_vencimento
        ? new Date(pedido.data_primeiro_vencimento)
        : addDays(new Date(), 30);

      for (let i = 0; i < numParcelas; i++) {
        const dataVencimento = addDays(dataBase, i * (pedido.intervalo_parcelas_dias || 30));
        await base44.entities.LancamentoFinanceiro.create({
          ...baseLancamento,
          descricao: `Compra de Mercadoria - ${pedido.numero} (${i + 1}/${numParcelas})`,
          valor: valorParcela,
          data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
          observacoes: `Parcela ${i + 1} de ${numParcelas}. Aguardando aprovação do financeiro.`,
        });
      }
    }

    await base44.entities.PedidoCompra.update(pedido.id, {
      status: 'Aguardando Liberação',
      status_aprovacao_financeira: 'Aguardando Aprovação Financeira'
    });

    await base44.entities.Tarefa.create({
      titulo: `Aguardando Manifesto/NF - ${pedido.numero}`,
      tipo: 'Aguardando Manifesto/NF',
      status: 'Pendente',
      prioridade: 'Alta',
      responsavel_id: currentUser.id,
      responsavel_nome: currentUser.full_name,
      referencia_tipo: 'PedidoCompra',
      referencia_id: pedido.id,
      referencia_numero: pedido.numero,
      valor_pendente: valorTotal,
      descricao: `Aguardando recebimento de NF/Manifesto do fornecedor ${pedido.fornecedor_nome} para programar a recepção.`,
      data_vencimento: format(new Date(pedido.data_prevista_entrega || new Date()), 'yyyy-MM-dd')
    });
  }
}