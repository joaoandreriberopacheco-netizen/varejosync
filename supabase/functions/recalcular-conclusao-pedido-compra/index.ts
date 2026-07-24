// Recalcula estoque dos produtos de um pedido de compra concluído/recebido
import { requireUser, jsonResponse, badRequest } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => ({}));
  const pedidoId = body.pedidoId || body.pedido_id;
  if (!pedidoId) return badRequest('pedidoId obrigatório');

  const { data: pedido, error: pErr } = await auth.client
    .from('pedido_compra')
    .select('itens, dados')
    .eq('id', pedidoId)
    .maybeSingle();
  if (pErr) return jsonResponse({ error: pErr.message }, 500);
  if (!pedido) return jsonResponse({ error: 'Pedido não encontrado' }, 404);

  const itens = (pedido.itens || pedido.dados?.itens || []) as Array<{ produto_id?: string }>;
  const ids = [...new Set(itens.map((i) => i.produto_id).filter(Boolean))];
  const results: unknown[] = [];
  for (const pid of ids) {
    const { data, error } = await auth.client.rpc('recalcular_estoque_produto', { p_produto_id: pid });
    if (error) results.push({ produto_id: pid, error: error.message });
    else results.push({ produto_id: pid, ...(data as object) });
  }
  return jsonResponse({ success: true, pedido_id: pedidoId, recalculados: results.length, results });
});
