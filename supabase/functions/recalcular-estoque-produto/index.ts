// RPC wrapper: recalcular_estoque_produto
import { requireUser, jsonResponse, badRequest } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => ({}));
  const produtoId = body.produtoId || body.produto_id;
  if (!produtoId) return badRequest('produtoId obrigatório');
  const { data, error } = await auth.client.rpc('recalcular_estoque_produto', {
    p_produto_id: String(produtoId),
  });
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse(data);
});
