import { base44 } from '@/api/base44Client';
import {
  iso90DiasAtras,
  pedidoDentroJanela90d,
  pedidoElegivelIep,
} from '@/lib/calcularIepProdutos';

const PEDIDO_IDS_CHUNK = 40;
const PEDIDO_GET_CHUNK = 20;

function normalizeItemVenda(it) {
  return {
    produto_id: it?.produto_id ?? it?.produtoId,
    produtoId: it?.produto_id ?? it?.produtoId,
    quantidade_base: it?.quantidade_base,
    quantidade: it?.quantidade ?? it?.quantidade_comercial,
    fator_conversao: it?.fator_conversao ?? it?.fator_aplicado,
    preco_final_unitario_fator1: it?.preco_final_unitario_fator1,
    preco_unitario_fator1: it?.preco_unitario_fator1,
    preco_unitario_comercial: it?.preco_unitario_comercial,
    total: it?.total,
  };
}

function appendItem(itensPorProduto, rawItem) {
  const item = normalizeItemVenda(rawItem);
  const pid = String(item?.produto_id ?? item?.produtoId ?? '').trim();
  if (!pid) return;
  if (!itensPorProduto[pid]) itensPorProduto[pid] = [];
  itensPorProduto[pid].push(item);
}

function countLinhasItens(itensPorProduto) {
  let total = 0;
  for (const linhas of Object.values(itensPorProduto || {})) {
    total += Array.isArray(linhas) ? linhas.length : 0;
  }
  return total;
}

function rowsFromApi(batch) {
  return Array.isArray(batch) ? batch : batch?.data ?? [];
}

async function carregarPedidoVendaItensPorIds(pedidoIds, itensPorProduto) {
  if (!pedidoIds.length || !base44.entities.PedidoVendaItem?.filter) return 0;

  let added = 0;
  for (let i = 0; i < pedidoIds.length; i += PEDIDO_IDS_CHUNK) {
    const chunk = pedidoIds.slice(i, i + PEDIDO_IDS_CHUNK);
    try {
      const batch = await base44.entities.PedidoVendaItem.filter({
        pedido_venda_id: { $in: chunk },
      });
      const rows = rowsFromApi(batch);
      for (const it of rows) {
        const before = countLinhasItens(itensPorProduto);
        appendItem(itensPorProduto, it);
        if (countLinhasItens(itensPorProduto) > before) added += 1;
      }
    } catch {
      for (const pedidoId of chunk) {
        try {
          const batch = await base44.entities.PedidoVendaItem.filter({
            pedido_venda_id: pedidoId,
          });
          for (const it of rowsFromApi(batch)) appendItem(itensPorProduto, it);
        } catch {
          /* pedido sem linhas canónicas */
        }
      }
    }
  }
  return added;
}

async function carregarEspelhoItensPorIds(pedidoIds, itensPorProduto) {
  if (!pedidoIds.length || !base44.entities.PedidoVenda?.filter) return;

  for (let i = 0; i < pedidoIds.length; i += PEDIDO_IDS_CHUNK) {
    const chunk = pedidoIds.slice(i, i + PEDIDO_IDS_CHUNK);
    try {
      const batch = await base44.entities.PedidoVenda.filter({ id: { $in: chunk } });
      for (const pedido of rowsFromApi(batch)) {
        for (const it of pedido?.itens || []) appendItem(itensPorProduto, it);
      }
    } catch {
      for (let j = 0; j < chunk.length; j += PEDIDO_GET_CHUNK) {
        const sub = chunk.slice(j, j + PEDIDO_GET_CHUNK);
        await Promise.all(
          sub.map(async (pedidoId) => {
            try {
              const pedido = await base44.entities.PedidoVenda.get(pedidoId);
              const row = pedido?.data ?? pedido;
              for (const it of row?.itens || []) appendItem(itensPorProduto, it);
            } catch {
              /* ignorar */
            }
          }),
        );
      }
    }
  }
}

/**
 * Pedidos elegíveis para ABCD (últimos 90 dias).
 * Não filtra tipo no servidor — o espelho da listagem muitas vezes vem sem `itens`.
 */
export async function fetchPedidosVenda90d() {
  const dataISO = iso90DiasAtras();
  const cutMs = new Date(dataISO).getTime();
  const todosPedidos = [];
  let skip = 0;
  const pageSize = 500;

  while (true) {
    const batch = await base44.entities.PedidoVenda.filter(
      {
        status: { $ne: 'Cancelado' },
        created_date: { $gte: dataISO },
      },
      '-created_date',
      pageSize,
      skip,
    );
    const rows = rowsFromApi(batch);
    if (!rows.length) break;

    for (const pedido of rows) {
      if (pedidoElegivelIep(pedido) && pedidoDentroJanela90d(pedido, dataISO)) {
        todosPedidos.push(pedido);
      }
    }

    if (rows.length < pageSize) break;

    const last = rows[rows.length - 1];
    const lastRaw = last?.created_date ?? last?.created_at;
    if (lastRaw && new Date(lastRaw).getTime() < cutMs) break;

    skip += pageSize;
  }

  return todosPedidos;
}

/**
 * Índice produto_id → linhas de venda (90d).
 * 1) espelho na listagem (se vier)  2) PedidoVendaItem ($in)  3) PedidoVenda completo
 */
export async function buildItensPorProduto90d(pedidos90d) {
  const pedidos = Array.isArray(pedidos90d) ? pedidos90d : [];
  const itensPorProduto = {};
  const pedidoIds = pedidos.map((p) => String(p.id)).filter(Boolean);

  for (const pedido of pedidos) {
    for (const it of pedido?.itens || []) appendItem(itensPorProduto, it);
  }

  if (!pedidoIds.length) return itensPorProduto;

  const linhasIniciais = countLinhasItens(itensPorProduto);
  if (linhasIniciais < pedidoIds.length) {
    await carregarPedidoVendaItensPorIds(pedidoIds, itensPorProduto);
  }

  if (countLinhasItens(itensPorProduto) < pedidoIds.length) {
    await carregarEspelhoItensPorIds(pedidoIds, itensPorProduto);
  }

  return itensPorProduto;
}

/** Pedidos 90d + índice de itens por produto (para ABCD). */
export async function fetchDadosVendaAbcd90d() {
  const pedidos90d = await fetchPedidosVenda90d();
  const itensPorProduto = await buildItensPorProduto90d(pedidos90d);
  return {
    pedidos90d,
    itensPorProduto,
    itens_linhas: countLinhasItens(itensPorProduto),
  };
}

export { countLinhasItens };
