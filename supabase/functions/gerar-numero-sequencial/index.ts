// RPC wrapper: gerar_numero_sequencial
import { requireUser, jsonResponse } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => ({}));
  const { data, error } = await auth.client.rpc('gerar_numero_sequencial', body);
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse(data);
});
