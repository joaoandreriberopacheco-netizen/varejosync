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

    const { pedidos } = await req.json();

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      return Response.json({ error: 'Nenhum pedido informado' }, { status: 400 });
    }

    for (const pedido of pedidos) {
      const valorTotal = Number(pedido.valor_total) || 0;

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