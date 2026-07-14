import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const round6 = (n: number) => Math.round((Number(n) || 0) * 1_000_000) / 1_000_000;

const isPedidoNaoConcluido = (pedido: any) => {
  const status = String(pedido?.status || '').trim();
  const statusReceb = String(pedido?.status_recebimento_geral || '').trim();
  return status !== 'Concluído' && !statusReceb.startsWith('Concluído');
};

/**
 * Backfill: confia que `custo_unitario` legado já está no eixo **fator-1** (R$/[unidade base]),
 * conforme prática estável do usuário. Não altera o valor — só alinha os campos derivados:
 *   - `_base`             = `custo_unitario` (alias canônico fator-1).
 *   - `_apresentacao`     = `custo_unitario × fator_conversao` (snapshot p/ UI).
 *   - `quantidade_base`   = `quantidade × fator_conversao` (se ausente).
 *   - `total`             = `quantidade_base × custo_final_unitario` (se inconsistente).
 *
 * Itens em que o usuário tenha digitado o valor já em comercial saem dobrados no PDF —
 * esses são correções manuais (Phoenix etc.).
 */
const normalizeItemCanonical = (item: any = {}) => {
  const fator = Number(item?.fator_conversao) || 1;
  const quantidade = Number(item?.quantidade) || 0;
  const quantidadeBase = Number(item?.quantidade_base);
  const quantidadeBaseFinal = Number.isFinite(quantidadeBase) && quantidadeBase > 0
    ? quantidadeBase
    : (quantidade * fator);

  const custoUnit = Number(item?.custo_unitario) || 0;
  const custoFinal = Number.isFinite(Number(item?.custo_final_unitario))
    ? Number(item?.custo_final_unitario)
    : custoUnit;

  const totalRecalculado = quantidadeBaseFinal * custoFinal;

  return {
    ...item,
    quantidade_base: round6(quantidadeBaseFinal),
    preco_eixo: 'FATOR_1',
    unidade_apresentacao: item?.unidade_apresentacao || item?.unidade_medida || 'UN',
    custo_unitario_base: round6(custoUnit),
    custo_final_unitario_base: round6(custoFinal),
    custo_unitario_apresentacao: round6(custoUnit * fator),
    custo_final_unitario_apresentacao: round6(custoFinal * fator),
    subtotal: round6(quantidadeBaseFinal * custoUnit),
    total: round6(totalRecalculado),
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

