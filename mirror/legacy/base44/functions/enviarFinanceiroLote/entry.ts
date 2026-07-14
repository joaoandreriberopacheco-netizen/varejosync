import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const dataHojeFormatado = () => {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Rio_Branco',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

const addDaysToDateString = (dateString: string, days: number) => {
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
  const fator = Number(item?.fator_conversao) || 1;
  const qty = Number(item?.quantidade) || 0;
  const custoLiquido = custo - desc;
  if (item?.preco_eixo === 'FATOR_1' || (fator > 1 && qty > 0 && Math.abs(custoLiquido - custo) < 0.001)) {
    return round2(qb * custoLiquido);
  }
  return round2(qb * custoLiquido);
};

const calcValorItensPedido = (pedido: Record<string, unknown>) => {
  const itens = Array.isArray(pedido?.itens) ? (pedido.itens as Array<Record<string, unknown>>) : [];
  if (itens.length > 0) {
    return round2(itens.reduce((acc, item) => acc + totalLinha(item), 0));
  }
  return round2(Number(pedido?.valor_itens) || 0);
};

const calcValorTotalPedido = (pedido: Record<string, unknown>) => {
  const valorItens = calcValorItensPedido(pedido);
  const frete = Number(pedido?.valor_frete) || 0;
  const desconto = Number(pedido?.valor_desconto) || 0;
  return round2(valorItens + frete - desconto);
};

const STATUS_ENVIO = 'Aguardando Aprovação Financeira';

const isLancamentoPago = (l: Record<string, unknown>) =>
  l?.status === 'Pago' || Boolean(l?.data_pagamento);

const statusCancelavel = (l: Record<string, unknown>) =>
  l?.status === 'Em Aberto' || l?.status === 'Vencido';

async function listarLancamentos(base44: ReturnType<typeof createClientFromRequest>, pedidoId: string) {
  const [porVinculo, porReferencia] = await Promise.all([
    base44.entities.LancamentoFinanceiro.filter({ pedido_compra_vinculado_id: pedidoId }),
    base44.entities.LancamentoFinanceiro.filter({
      referencia_id: pedidoId,
      referencia_tipo: 'PedidoCompra',
    }),
  ]);
  const merged = [...(porVinculo || []), ...(porReferencia || [])];
  return merged.filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);
}

async function cancelarLancamentosAbertos(
  base44: ReturnType<typeof createClientFromRequest>,
  pedidoId: string,
) {
  const lancamentos = await listarLancamentos(base44, pedidoId);
  const alvos = lancamentos.filter((l) => statusCancelavel(l) && !isLancamentoPago(l));
  for (const l of alvos) {
    await base44.entities.LancamentoFinanceiro.update(l.id, {
      status: 'Cancelado',
      observacoes: `${l.observacoes || ''}\n[Cancelado: envio em lote ao financeiro]`.trim(),
    });
  }
}

async function enviarUmPedido(
  base44: ReturnType<typeof createClientFromRequest>,
  user: Record<string, unknown>,
  pedidoRef: Record<string, unknown>,
  opts: {
    formaPagamento: string;
    dataPrimeiroVencimento: string;
    numParcelas: number;
    intervaloParcelasDias: number;
  },
) {
  const pedidoId = String(pedidoRef?.id || '');
  if (!pedidoId) throw new Error('Pedido sem id');

  const rows = await base44.entities.PedidoCompra.filter({ id: pedidoId });
  const pedido = rows?.[0] || pedidoRef;
  const numero = String(pedido.numero || pedidoId);

  if (pedido.status !== 'Rascunho') {
    throw new Error(`Pedido ${numero} não está em Rascunho`);
  }

  const lancs = await listarLancamentos(base44, pedidoId);
  if (lancs.some(isLancamentoPago)) {
    throw new Error(`Pedido ${numero} tem parcelas pagas`);
  }

  const valorItens = calcValorItensPedido(pedido);
  const valorTotal = calcValorTotalPedido(pedido);
  const forma = opts.formaPagamento || pedido.forma_pagamento_compra || 'Parcelado';
  const dataVenc = opts.dataPrimeiroVencimento || pedido.data_primeiro_vencimento || dataHojeFormatado();
  const parcelas = Math.max(1, Number(opts.numParcelas) || Number(pedido.num_parcelas) || 1);
  const intervaloDias = Math.max(1, Number(opts.intervaloParcelasDias) || Number(pedido.intervalo_parcelas_dias) || 30);

  await cancelarLancamentosAbertos(base44, pedidoId);

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

  if (forma === 'À Vista') {
    await base44.entities.LancamentoFinanceiro.create({
      ...baseLancamento,
      descricao: `Compra de Mercadoria - ${pedido.numero} (À Vista)`,
      forma_pagamento_tipo: 'À Vista',
      forma_pagamento_compra: 'À Vista',
      valor: valorTotal,
      data_vencimento: dataVenc,
      observacoes: 'Pagamento à vista. Aguardando aprovação do financeiro.',
    });
  } else {
    const valorParcela = valorTotal / parcelas;
    for (let i = 0; i < parcelas; i += 1) {
      await base44.entities.LancamentoFinanceiro.create({
        ...baseLancamento,
        descricao: `Compra de Mercadoria - ${pedido.numero} (${i + 1}/${parcelas})`,
        forma_pagamento_tipo: 'Parcelado',
        forma_pagamento_compra: 'Parcelado',
        valor: valorParcela,
        data_vencimento: addDaysToDateString(dataVenc, i * intervaloDias),
        observacoes: `Parcela ${i + 1} de ${parcelas}. Aguardando aprovação do financeiro.`,
      });
    }
  }

  const notaHistorico = `\n[Enviado ao financeiro em lote: ${user.full_name || 'Usuário'} | ${new Date().toISOString()}]`;

  await base44.entities.PedidoCompra.update(pedido.id, {
    status: STATUS_ENVIO,
    status_aprovacao_financeira: STATUS_ENVIO,
    forma_pagamento_compra: forma,
    data_primeiro_vencimento: dataVenc,
    num_parcelas: forma === 'Parcelado' ? parcelas : 1,
    intervalo_parcelas_dias: intervaloDias,
    valor_itens: valorItens,
    valor_total: valorTotal,
    historico: (pedido.historico || '') + notaHistorico,
  });

  await base44.entities.Tarefa.create({
    titulo: `Recebimento de Mercadoria - ${pedido.numero}`,
    tipo: 'Recebimento de Mercadoria',
    status: 'Pendente',
    prioridade: 'Alta',
    responsavel_id: user.id,
    responsavel_nome: user.full_name,
    referencia_tipo: 'PedidoCompra',
    referencia_id: pedido.id,
    referencia_numero: pedido.numero,
    valor_pendente: valorTotal,
    descricao: `Aguardando recebimento da mercadoria do fornecedor ${pedido.fornecedor_nome}. Informe despacho e chegada na aba Logística do pedido.`,
    data_vencimento: pedido.data_prevista_entrega
      ? String(pedido.data_prevista_entrega).slice(0, 10)
      : dataVenc,
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const pedidos = body?.pedidos;
    const formaPagamento = body?.formaPagamento || 'Parcelado';
    const dataPrimeiroVencimento = body?.dataPrimeiroVencimento || dataHojeFormatado();
    const numParcelas = Math.max(1, Number(body?.numParcelas) || 1);
    const intervaloParcelasDias = Math.max(1, Number(body?.intervaloParcelasDias) || 30);

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      return Response.json({ error: 'Nenhum pedido informado' }, { status: 400 });
    }

    const idsVistos = new Set<string>();
    const enviados: string[] = [];
    const erros: Array<{ id: string; mensagem: string }> = [];

    for (const pedido of pedidos) {
      const id = String(pedido?.id || '');
      if (!id || idsVistos.has(id)) continue;
      idsVistos.add(id);

      try {
        await enviarUmPedido(base44, user, pedido, {
          formaPagamento,
          dataPrimeiroVencimento,
          numParcelas,
          intervaloParcelasDias,
        });
        enviados.push(id);
      } catch (error) {
        erros.push({ id, mensagem: error?.message || String(error) });
      }
    }

    if (!enviados.length && erros.length) {
      return Response.json({ error: erros.map((e) => e.mensagem).join(' · ') }, { status: 400 });
    }

    return Response.json({ success: true, quantidade: enviados.length, enviados, erros });
  } catch (error) {
    console.error('Erro ao enviar pedidos em lote:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
