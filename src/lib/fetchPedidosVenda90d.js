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

function appendItemToIndexes(itensPorProduto, itensPorPedido, pedidoId, rawItem) {
  const item = normalizeItemVenda(rawItem);
  const pid = String(item?.produto_id ?? item?.produtoId ?? '').trim();
  const pvid = String(pedidoId ?? rawItem?.pedido_venda_id ?? '').trim();

  if (pid) {
    if (!itensPorProduto[pid]) itensPorProduto[pid] = [];
    itensPorProduto[pid].push(item);
  }
  if (pvid) {
    if (!itensPorPedido[pvid]) itensPorPedido[pvid] = [];
    itensPorPedido[pvid].push(item);
  }
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

function hydratePedidosComItens(pedidos, itensPorPedido) {
  return pedidos.map((pedido) => {
    const carregados = itensPorPedido[String(pedido.id)] || [];
    const espelho = Array.isArray(pedido.itens) && pedido.itens.length ? pedido.itens : [];
    const itens = espelho.length ? espelho : carregados;
    return { ...pedido, itens };
  });
}

async function carregarPedidoVendaItensPorIds(pedidoIds, itensPorProduto, itensPorPedido) {
  if (!pedidoIds.length || !base44.entities.PedidoVendaItem?.filter) return;

  for (let i = 0; i < pedidoIds.length; i += PEDIDO_IDS_CHUNK) {
    const chunk = pedidoIds.slice(i, i + PEDIDO_IDS_CHUNK);
    try {
      const batch = await base44.entities.PedidoVendaItem.filter({
        pedido_venda_id: { $in: chunk },
      });
      for (const it of rowsFromApi(batch)) {
        appendItemToIndexes(itensPorProduto, itensPorPedido, it.pedido_venda_id, it);
      }
    } catch {
      for (const pedidoId of chunk) {
        try {
          const batch = await base44.entities.PedidoVendaItem.filter({
            pedido_venda_id: pedidoId,
          });
          for (const it of rowsFromApi(batch)) {
            appendItemToIndexes(itensPorProduto, itensPorPedido, pedidoId, it);
          }
        } catch {
          /* pedido sem linhas canónicas */
        }
      }
    }
  }
}

async function carregarEspelhoItensPorIds(pedidoIds, itensPorProduto, itensPorPedido) {
  if (!pedidoIds.length || !base44.entities.PedidoVenda?.filter) return;

  for (let i = 0; i < pedidoIds.length; i += PEDIDO_IDS_CHUNK) {
    const chunk = pedidoIds.slice(i, i + PEDIDO_IDS_CHUNK);
    try {
      const batch = await base44.entities.PedidoVenda.filter({ id: { $in: chunk } });
      for (const pedido of rowsFromApi(batch)) {
        for (const it of pedido?.itens || []) {
          appendItemToIndexes(itensPorProduto, itensPorPedido, pedido.id, it);
        }
      }
    } catch {
      for (let j = 0; j < chunk.length; j += PEDIDO_GET_CHUNK) {
        const sub = chunk.slice(j, j + PEDIDO_GET_CHUNK);
        await Promise.all(
          sub.map(async (pedidoId) => {
            try {
              const pedido = await base44.entities.PedidoVenda.get(pedidoId);
              const row = pedido?.data ?? pedido;
              for (const it of row?.itens || []) {
                appendItemToIndexes(itensPorProduto, itensPorPedido, pedidoId, it);
              }
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
 * Pedidos PDV elegíveis para relatório de vendas (últimos 90 dias).
 * Versão leve — sem hidratação PedidoVendaItem.
 * Para ABCD/IEP no catálogo use fetchDadosVendaAbcd90d.
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
        tipo: 'PDV',
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
 * Índices de venda 90d + pedidos com `itens` preenchidos (ABCD/IEP no catálogo).
 */
export async function buildItensIndexes90d(pedidos90d) {
  const pedidos = Array.isArray(pedidos90d) ? pedidos90d : [];
  const itensPorProduto = {};
  const itensPorPedido = {};
  const pedidoIds = pedidos.map((p) => String(p.id)).filter(Boolean);

  for (const pedido of pedidos) {
    for (const it of pedido?.itens || []) {
      appendItemToIndexes(itensPorProduto, itensPorPedido, pedido.id, it);
    }
  }

  if (pedidoIds.length) {
    if (countLinhasItens(itensPorProduto) < pedidoIds.length) {
      await carregarPedidoVendaItensPorIds(pedidoIds, itensPorProduto, itensPorPedido);
    }
    if (countLinhasItens(itensPorProduto) < pedidoIds.length) {
      await carregarEspelhoItensPorIds(pedidoIds, itensPorProduto, itensPorPedido);
    }
  }

  return { itensPorProduto, itensPorPedido };
}

/** Pedidos 90d com itens + índice por produto (cálculo ABCD ao vivo no catálogo). */
export async function fetchDadosVendaAbcd90d() {
  const dataISO = iso90DiasAtras();
  const cutMs = new Date(dataISO).getTime();
  const pedidosBase = [];
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
        pedidosBase.push(pedido);
      }
    }

    if (rows.length < pageSize) break;

    const last = rows[rows.length - 1];
    const lastRaw = last?.created_date ?? last?.created_at;
    if (lastRaw && new Date(lastRaw).getTime() < cutMs) break;

    skip += pageSize;
  }

  const { itensPorProduto, itensPorPedido } = await buildItensIndexes90d(pedidosBase);
  const pedidos90d = hydratePedidosComItens(pedidosBase, itensPorPedido);

  return {
    pedidos90d,
    itensPorProduto,
    itens_linhas: countLinhasItens(itensPorProduto),
  };
}

export { countLinhasItens };
