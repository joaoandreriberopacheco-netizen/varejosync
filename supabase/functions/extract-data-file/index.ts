// Stub ExtractDataFromUploadedFile — delega parsing ao cliente ou importadores dedicados
import { requireUser, jsonResponse, badRequest } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => ({}));
  if (!body.file_url && !body.file_content) {
    return badRequest('file_url ou file_content obrigatório');
  }
  return jsonResponse({
    error: 'Use importarProdutos ou importarPedidosCompra para parsing estruturado.',
    status: 'not_implemented',
  }, 501);
});
