import { base44 } from '@/api/base44Client';
import { iso90DiasAtras } from '@/lib/calcularIepProdutos';

/**
 * Movimentações de estoque dos últimos 90 dias (paginado).
 */
export async function fetchMovimentacoesEstoque90d() {
  const dataISO = iso90DiasAtras();
  const todos = [];
  let skip = 0;
  const pageSize = 500;

  while (true) {
    const batch = await base44.entities.MovimentacaoEstoque.filter(
      { created_date: { $gte: dataISO } },
      'created_date',
      pageSize,
      skip,
    );
    const rows = Array.isArray(batch) ? batch : batch?.data ?? [];
    if (!rows.length) break;
    todos.push(...rows);
    if (rows.length < pageSize) break;
    skip += pageSize;
  }

  return todos;
}

/** Agrupa movimentações por produto_id. */
export function groupMovimentacoesPorProduto(movimentacoes) {
  const map = {};
  for (const m of movimentacoes || []) {
    const pid = m?.produto_id;
    if (!pid) continue;
    if (!map[pid]) map[pid] = [];
    map[pid].push(m);
  }
  return map;
}
