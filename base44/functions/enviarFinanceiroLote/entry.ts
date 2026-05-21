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

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const totalLinha = (item: Record<string, unknown>) => {
  const direto = Number(item?.total ?? item?.valor_total_item ?? item?.subtotal);
  if (Number.isFinite(direto) && direto > 0) return direto;
  const qb =
    Number(item?.quantidade_base) ||
    (Number(item?.quantidade) || 0) * (Number(item?.fator_conversao) || 1);
  const custo = Number(item?.custo_unitario) || 0;
  const desc = Number(item?.valor_desconto_item ?? item?.desconto_unitario) || 0;
  return qb * (custo - desc);
};

/** Itens + frete − desconto global (mesma regra do PedidoCompraForm). */
const calcValorTotalPedido = (pedido: Record<string, unknown>) => {
  const itens = Array.isArray(pedido?.itens) ? pedido.itens as Array<Record<string, unknown>> : [];
  const valorItens =
    itens.length > 0
      ? itens.reduce((acc, item) => acc + totalLinha(item), 0)
      : Number(pedido?.valor_itens) || 0;
  const frete = Number(pedido?.valor_frete) || 0;
  const desconto = Number(pedido?.valor_desconto) || 0;
  return round2(valorItens + frete - desconto);
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pedidos } = await req.json();

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      return Response.json({ error: 'Nenhum pedido informado' }, { status: 400 });
    }

    for (const pedido of pedidos) {
      const valorTotal = calcValorTotalPedido(pedido);

      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Aguardando Liberação',
        status_aprovacao_financeira: 'Aguardando Aprovação Financeira',
        valor_total: valorTotal,
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