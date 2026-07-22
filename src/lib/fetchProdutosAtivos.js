import { base44 } from '@/api/base44Client';

export function isProdutoAtivoCompra(produto) {
  if (!produto || typeof produto !== 'object') return false;
  if (produto.ativo === false) return false;
  if (produto.tipo === 'Serviço') return false;
  return true;
}

/**
 * Lista todos os produtos ativos do catálogo (paginado).
 * Usa Produto.list como o Catálogo — evita limite implícito do filter.
 */
export async function fetchProdutosAtivos(options = {}) {
  const { provided, pageSize = 500 } = options;

  if (Array.isArray(provided) && provided.length > 0) {
    return provided.filter(isProdutoAtivoCompra);
  }

  const todos = [];
  let skip = 0;

  while (true) {
    const batch = await base44.entities.Produto.list('-created_date', pageSize, skip);
    const rows = Array.isArray(batch) ? batch : batch?.data ?? [];
    if (!rows.length) break;
    todos.push(...rows.filter(isProdutoAtivoCompra));
    if (rows.length < pageSize) break;
    skip += pageSize;
  }

  return todos;
}
