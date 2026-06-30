import { base44 } from '@/api/base44Client';
import {
  iso90DiasAtras,
  pedidoDentroJanela90d,
  pedidoElegivelIep,
} from '@/lib/calcularIepProdutos';

function normalizeItemVenda(it) {
  return {
    produto_id: it?.produto_id ?? it?.produtoId,
    produtoId: it?.produto_id ?? it?.produtoId,
    quantidade_base: it?.quantidade_base,
    quantidade: it?.quantidade ?? it?.quantidade_comercial,
    fator_conversao: it?.fator_conversao ?? it?.fator_aplicado,
    total: it?.total,
  };
}

function appendItem(itensPorProduto, rawItem) {
  const item = normalizeItemVenda(rawItem);
  const pid = String(item?.produto_id ?? item?.produtoId ?? '');
  if (!pid) return;
  if (!itensPorProduto[pid]) itensPorProduto[pid] = [];
  itensPorProduto[pid].push(item);
}

/**
 * Pedidos PDV elegíveis para IEP / velocidade de vendas (últimos 90 dias).
 * Filtro de data no servidor + paragem antecipada na paginação (ordem -created_date).
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
    const rows = Array.isArray(batch) ? batch : batch?.data ?? [];
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
 * Usa espelho PedidoVenda.itens e, quando vazio, PedidoVendaItem (fonte canónica).
 */
export async function buildItensPorProduto90d(pedidos90d) {
  const pedidos = Array.isArray(pedidos90d) ? pedidos90d : [];
  const itensPorProduto = {};
  const pedidosComEspelho = new Set();

  for (const pedido of pedidos) {
    const itens = pedido?.itens;
    if (!Array.isArray(itens) || !itens.length) continue;
    pedidosComEspelho.add(String(pedido.id));
    for (const it of itens) appendItem(itensPorProduto, it);
  }

  const pedidoIdsCanonico = new Set(
    pedidos
      .filter((p) => !pedidosComEspelho.has(String(p.id)))
      .map((p) => String(p.id)),
  );

  if (!pedidoIdsCanonico.size || !base44.entities.PedidoVendaItem) {
    return itensPorProduto;
  }

  let skip = 0;
  const pageSize = 500;

  while (true) {
    const batch = await base44.entities.PedidoVendaItem.list('-created_date', pageSize, skip);
    const rows = Array.isArray(batch) ? batch : batch?.data ?? [];
    if (!rows.length) break;

    for (const it of rows) {
      if (!pedidoIdsCanonico.has(String(it?.pedido_venda_id ?? ''))) continue;
      appendItem(itensPorProduto, it);
    }

    skip += pageSize;
    if (rows.length < pageSize) break;
  }

  return itensPorProduto;
}

/** Pedidos 90d + índice de itens por produto (para ABCD). */
export async function fetchDadosVendaAbcd90d() {
  const pedidos90d = await fetchPedidosVenda90d();
  const itensPorProduto = await buildItensPorProduto90d(pedidos90d);
  return { pedidos90d, itensPorProduto };
}
