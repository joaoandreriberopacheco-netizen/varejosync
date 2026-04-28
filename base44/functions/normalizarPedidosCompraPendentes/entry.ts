import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const round6 = (n: number) => Math.round((Number(n) || 0) * 1_000_000) / 1_000_000;

const isPedidoNaoConcluido = (pedido: any) => {
  const status = String(pedido?.status || '').trim();
  const statusReceb = String(pedido?.status_recebimento_geral || '').trim();
  return status !== 'Concluído' && !statusReceb.startsWith('Concluído');
};

const normalizeItemCanonical = (item: any = {}) => {
  const fator = Number(item?.fator_conversao) || 1;
  const quantidade = Number(item?.quantidade) || 0;
  const quantidadeBase = Number(item?.quantidade_base);
  const quantidadeBaseFinal = Number.isFinite(quantidadeBase) ? quantidadeBase : (quantidade * fator);

  const custoUnit = Number(item?.custo_unitario) || 0;
  const custoFinal = Number.isFinite(Number(item?.custo_final_unitario))
    ? Number(item?.custo_final_unitario)
    : custoUnit;

  return {
    ...item,
    quantidade_base: round6(quantidadeBaseFinal),
    preco_eixo: 'FATOR_1',
    unidade_apresentacao: item?.unidade_apresentacao || item?.unidade_medida || 'UN',
    custo_unitario_base: round6(fator > 0 ? (custoUnit / fator) : custoUnit),
    custo_final_unitario_base: round6(fator > 0 ? (custoFinal / fator) : custoFinal),
    custo_unitario_apresentacao: round6(custoUnit),
    custo_final_unitario_apresentacao: round6(custoFinal),
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const limit = Math.min(Number(body?.limit) || 200, 1000);

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.list();
    const pendentes = (pedidos || []).filter(isPedidoNaoConcluido).slice(0, limit);

    const updates: Array<{ id: string; itens_count: number }> = [];
    for (const pedido of pendentes) {
      const itens = Array.isArray(pedido?.itens) ? pedido.itens : [];
      if (!itens.length) continue;
      const itensNorm = itens.map(normalizeItemCanonical);
      if (dryRun) {
        updates.push({ id: pedido.id, itens_count: itensNorm.length });
        continue;
      }
      await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, {
        itens: itensNorm,
      });
      updates.push({ id: pedido.id, itens_count: itensNorm.length });
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      total_lidos: pedidos?.length || 0,
      pendentes_processados: updates.length,
      updates,
    });
  } catch (error) {
    console.error('normalizarPedidosCompraPendentes error:', error);
    return Response.json({ error: error?.message || 'Erro inesperado' }, { status: 500 });
  }
});

