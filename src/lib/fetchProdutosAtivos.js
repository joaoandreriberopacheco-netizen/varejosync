import { base44 } from '@/api/base44Client';

export function isProdutoAtivoCompra(produto) {
  if (!produto || typeof produto !== 'object') return false;
  if (produto.ativo === false) return false;
  if (produto.tipo === 'Serviço') return false;
  return true;
}

function rowsFromProdutoList(batch) {
  return Array.isArray(batch) ? batch : batch?.data ?? [];
}

/**
 * Lista todos os produtos ativos do catálogo (paginado com deduplicação).
 * Evita loop infinito quando a API ignora `skip` e repete a mesma página.
 */
export async function fetchProdutosAtivos(options = {}) {
  const { provided, pageSize = 500, maxPages = 40 } = options;

  if (Array.isArray(provided) && provided.length > 0) {
    return provided.filter(isProdutoAtivoCompra);
  }

  const byId = new Map();
  let skip = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const batch = await base44.entities.Produto.list('-created_date', pageSize, skip);
    const rows = rowsFromProdutoList(batch);
    if (!rows.length) break;

    let novos = 0;
    for (const row of rows) {
      const id = row?.id;
      if (!id || byId.has(id)) continue;
      if (!isProdutoAtivoCompra(row)) continue;
      byId.set(id, row);
      novos += 1;
    }

    if (rows.length < pageSize) break;
    if (novos === 0) break;
    skip += pageSize;
  }

  return [...byId.values()];
}

/**
 * Lista todo o catálogo (paginado), incluindo inativos — necessário para margem bater com consulta de vendas.
 */
export async function fetchAllProdutosCatalogo(options = {}) {
  const { pageSize = 500, maxPages = 40 } = options;
  const byId = new Map();
  let skip = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const batch = await base44.entities.Produto.list('-created_date', pageSize, skip);
    const rows = rowsFromProdutoList(batch);
    if (!rows.length) break;

    let novos = 0;
    for (const row of rows) {
      const id = row?.id;
      if (!id || byId.has(id)) continue;
      byId.set(id, row);
      novos += 1;
    }

    if (rows.length < pageSize) break;
    if (novos === 0) break;
    skip += pageSize;
  }

  return [...byId.values()];
}
