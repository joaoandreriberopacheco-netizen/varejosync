// Port de base44/functions/corrigirMovimentosRecepcaoRetroativos
// Orquestra lote de pedidos; cada pedido corre na RPC transacional corrigir_movimentos_recepcao_um_pedido.
import { requireAdmin, jsonResponse, badRequest } from '../_shared/auth.ts';

type Payload = {
  dataInicio?: string;
  dataFim?: string;
  pedidoIds?: string[];
  dryRun?: boolean;
  varreduraCompletaPedidos?: boolean;
  limitePedidos?: number;
  somenteConcluidosRecepcaoSemStock?: boolean;
};

type RpcRow = Record<string, unknown>;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Use POST com JSON.' }, 405);
  }

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const { user, client } = auth;

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return badRequest('JSON inválido.');
  }

  const dryRun = body.dryRun !== false;
  const limite = Math.min(Math.max(Number(body.limitePedidos) || 8000, 1), 15000);
  let pedidoIds: string[] = [];
  let escopo = '';
  let pedidosRevistosNaFonte: number | undefined;

  if (body.somenteConcluidosRecepcaoSemStock === true) {
    escopo = 'somente_concluidos_recepcao_sem_stock';
    const lim = Math.min(Math.max(Number(body.limitePedidos) || 3000, 1), 15000);
    const { data: rows, error } = await client
      .from('pedido_compra')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(lim);
    if (error) return jsonResponse({ error: error.message }, 500);
    pedidosRevistosNaFonte = rows?.length ?? 0;

    const candidatos: string[] = [];
    for (const row of rows || []) {
      const id = String(row.id);
      const { data: probe, error: probeErr } = await client.rpc('corrigir_movimentos_recepcao_um_pedido', {
        p_payload: {
          pedido_id: id,
          dry_run: true,
          user_email: user.email || '',
        },
      });
      if (probeErr) continue;
      const p = probe as RpcRow;
      if (p.skipped) continue;
      if (!Array.isArray(p.deltas) || (p.deltas as unknown[]).length === 0) continue;
      candidatos.push(id);
    }
    pedidoIds = candidatos;
  } else if (Array.isArray(body.pedidoIds) && body.pedidoIds.length > 0) {
    escopo = 'lista_ids';
    pedidoIds = body.pedidoIds.map(String);
  } else if (body.varreduraCompletaPedidos === true) {
    escopo = 'varredura_todos';
    const { data: rows, error } = await client
      .from('pedido_compra')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(limite);
    if (error) return jsonResponse({ error: error.message }, 500);
    pedidoIds = (rows || []).map((r) => String(r.id));
  } else {
    escopo = 'intervalo_created_date';
    const { dataInicio, dataFim } = body;
    if (
      !dataInicio ||
      !dataFim ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dataFim)
    ) {
      return badRequest(
        'Use somenteConcluidosRecepcaoSemStock:true, ou pedidoIds, ou varreduraCompletaPedidos, ou dataInicio+dataFim.',
      );
    }
    const { data: rows, error } = await client
      .from('pedido_compra')
      .select('id, created_at')
      .gte('created_at', `${dataInicio}T00:00:00.000Z`)
      .lte('created_at', `${dataFim}T23:59:59.999Z`);
    if (error) return jsonResponse({ error: error.message }, 500);
    pedidoIds = (rows || []).map((r) => String(r.id));
  }

  const detalhes: RpcRow[] = [];
  const erros: RpcRow[] = [];
  let linhasCorrigidas = 0;
  let produtosRecalculados = 0;

  for (const pedidoId of pedidoIds) {
    const { data, error } = await client.rpc('corrigir_movimentos_recepcao_um_pedido', {
      p_payload: {
        pedido_id: pedidoId,
        dry_run: dryRun,
        user_email: user.email || '',
      },
    });
    if (error) {
      erros.push({ pedido_id: pedidoId, erro: error.message });
      continue;
    }
    const row = data as RpcRow;
    if (row.error) {
      erros.push({ pedido_id: pedidoId, erro: row.error });
      continue;
    }
    detalhes.push(row);
    if (!dryRun && row.aplicado) {
      linhasCorrigidas += Number(row.linhas_corrigidas || 0);
      const deltas = Array.isArray(row.deltas) ? row.deltas : [];
      produtosRecalculados += new Set(deltas.map((d: RpcRow) => d.produto_id)).size;
    }
  }

  const pedidosComDelta = detalhes.filter(
    (r) => Array.isArray(r.deltas) && (r.deltas as unknown[]).length > 0,
  ).length;

  return jsonResponse({
    success: true,
    dryRun,
    escopo,
    pedidos_revistos_na_fonte: pedidosRevistosNaFonte,
    pedidos_analisados: pedidoIds.length,
    pedidos_com_delta: pedidosComDelta,
    linhas_corrigidas: dryRun ? 0 : linhasCorrigidas,
    produtos_recalculados: dryRun ? 0 : produtosRecalculados,
    detalhes,
    erros,
    executadoPor: user.email,
  });
});
