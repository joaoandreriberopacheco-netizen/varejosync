/**
 * Correção retroativa recepção → estoque (ex.: WX7-A5N gravou 30 em vez de 6000).
 * Usado por `scripts/corrigir-recepcao-pedido.mjs` e `window.__corrigirRecepcaoPedido` no browser.
 */

import { invokeRecalcularEstoqueProduto } from './p38StockRecalc.js';

const roundQty = (n) => Math.round((Number(n) || 0) * 1_000_000) / 1_000_000;

function fatorProdutoPedido(pedido, produtoId) {
  const itens = Array.isArray(pedido?.itens) ? pedido.itens : [];
  const hit = itens.find((it) => String(it?.produto_id) === produtoId);
  const f = Number(hit?.fator_conversao ?? hit?.fator_aplicado ?? 1) || 1;
  return f > 0 ? f : 1;
}

function nomeProdutoPedido(pedido, produtoId) {
  const itens = Array.isArray(pedido?.itens) ? pedido.itens : [];
  const hit = itens.find((it) => String(it?.produto_id) === produtoId);
  return String(hit?.produto_nome || '');
}

function linhaProdutoPedido(pedido, produtoId) {
  const itens = Array.isArray(pedido?.itens) ? pedido.itens : [];
  return itens.find((it) => String(it?.produto_id) === produtoId);
}

async function loadEmbarques(base44, pedido) {
  const embedded = pedido?.embarques_registrados;
  if (Array.isArray(embedded) && embedded.length > 0) return embedded;
  const rows = await base44.entities.Embarque.filter({ pedido_compra_id: pedido.id }, '-created_date', 500);
  return Array.isArray(rows) ? rows : [];
}

function sumReceivedByProduct(embarques, pedido) {
  const acc = {};
  for (const emb of embarques) {
    const arr =
      Array.isArray(emb?.itens_embarcados) && emb.itens_embarcados.length
        ? emb.itens_embarcados
        : Array.isArray(emb?.itens)
          ? emb.itens
          : [];
    for (const item of arr) {
      const q = Number(item?.quantidade_recebida) || 0;
      if (q <= 0) continue;
      const pid = String(item?.produto_id_recebido_diferente || item?.produto_id || '');
      if (!pid) continue;
      const fator = fatorProdutoPedido(pedido, pid);
      acc[pid] = roundQty((acc[pid] || 0) + q * fator);
    }
  }
  return acc;
}

async function sumMovedByProduct(base44, pedidoId) {
  const seen = new Set();
  const acc = {};
  const ingest = (movs) => {
    for (const m of movs || []) {
      if (m?.id && seen.has(m.id)) continue;
      if (m?.id) seen.add(m.id);
      if (m.tipo !== 'Entrada' || m.motivo !== 'Compra') continue;
      const pid = m.produto_id;
      if (!pid) continue;
      const q = Number(m.quantidade) || 0;
      acc[pid] = roundQty((acc[pid] || 0) + q);
    }
  };
  let movs = await base44.entities.MovimentacaoEstoque.filter(
    { referencia_tipo: 'PedidoCompra', referencia_id: pedidoId },
    '-created_date',
    2000,
  );
  ingest(movs);
  const alt = await base44.entities.MovimentacaoEstoque.filter(
    { referencia_tipo: 'PedidoCompra', referencia_id: String(pedidoId) },
    '-created_date',
    2000,
  );
  ingest(alt);
  return acc;
}

function buildDeltas(recebido, movimentado) {
  const produtoIds = new Set([...Object.keys(recebido), ...Object.keys(movimentado)]);
  const deltas = [];
  for (const pid of produtoIds) {
    const r = recebido[pid] || 0;
    const m = movimentado[pid] || 0;
    const faltante = roundQty(Math.max(0, r - m));
    if (faltante > 0) {
      deltas.push({
        produto_id: pid,
        recebido_documental_base: r,
        ja_movimentado: m,
        faltante,
      });
    }
  }
  return deltas;
}

async function encontrarPedido(base44, { numero, pedidoId }) {
  if (pedidoId) {
    const rows = await base44.entities.PedidoCompra.filter({ id: pedidoId });
    if (rows?.[0]) return rows[0];
  }
  if (numero) {
    const norm = String(numero).trim().toUpperCase();
    const rows = await base44.entities.PedidoCompra.filter({ numero: norm });
    if (rows?.[0]) return rows[0];
    const recent = await base44.entities.PedidoCompra.list('-created_date', 3000);
    return (recent || []).find((p) => String(p?.numero || '').trim().toUpperCase() === norm) || null;
  }
  return null;
}

/**
 * @param {object} base44
 * @param {{ numero?: string, pedidoId?: string, apply?: boolean }} opts
 */
export async function corrigirRecepcaoPedido(base44, { numero = '', pedidoId = '', apply = false } = {}) {
  if (!numero && !pedidoId) {
    return { ok: false, error: 'Indique numero ou pedidoId.' };
  }

  const pedido = await encontrarPedido(base44, { numero, pedidoId });
  if (!pedido) {
    return { ok: false, error: `Pedido não encontrado (${numero || pedidoId}).` };
  }

  const embarques = await loadEmbarques(base44, pedido);
  const recebido = sumReceivedByProduct(embarques, pedido);
  const movimentado = await sumMovedByProduct(base44, pedido.id);
  const deltas = buildDeltas(recebido, movimentado);

  const report = {
    ok: true,
    dryRun: !apply,
    pedido_id: pedido.id,
    numero: pedido.numero,
    recebido_base: recebido,
    movimentado,
    deltas,
  };

  if (!deltas.length) {
    report.message = 'Nenhum delta — estoque já bate com recepção documental em base.';
    return report;
  }

  if (!apply) {
    report.message = 'Dry-run: passe apply=true para criar entradas complementares.';
    return report;
  }

  const obsBase = `Correção retroativa recepção→estoque; pedido ${pedido.numero || pedido.id}.`;
  const criados = [];

  for (const d of deltas) {
    const linha = linhaProdutoPedido(pedido, d.produto_id);
    const fator = fatorProdutoPedido(pedido, d.produto_id);
    const unidade = String(linha?.unidade_medida || linha?.unidade_sigla || '');

    const mov = await base44.entities.MovimentacaoEstoque.create({
      produto_id: d.produto_id,
      produto_nome: nomeProdutoPedido(pedido, d.produto_id) || 'Produto',
      tipo: 'Entrada',
      motivo: 'Compra',
      quantidade: d.faltante,
      quantidade_base: d.faltante,
      ...(fator > 1 ? { fator_conversao: fator } : {}),
      ...(unidade ? { unidade_medida: unidade, unidade_sigla: unidade } : {}),
      referencia_tipo: 'PedidoCompra',
      referencia_id: pedido.id,
      referencia_numero: pedido.numero,
      observacoes: obsBase,
      ...(pedido?.fornecedor_nome ? { fornecedor_nome: pedido.fornecedor_nome, terceiro_nome: pedido.fornecedor_nome } : {}),
    });
    await invokeRecalcularEstoqueProduto(base44, d.produto_id);
    criados.push({ produto_id: d.produto_id, movimento_id: mov?.id, faltante: d.faltante });
  }

  try {
    const tag = `\n[CORREÇÃO RECEPÇÃO→ESTOQUE | PC ${pedido.numero || pedido.id} | ${criados.length} linha(s) | ${new Date().toISOString()}]`;
    await base44.entities.PedidoCompra.update(pedido.id, {
      historico: String(pedido.historico || '') + tag,
    });
  } catch (e) {
    report.aviso_historico = String(e?.message || e);
  }

  report.criados = criados;
  report.message = `${criados.length} movimento(s) complementar(es) criado(s).`;
  return report;
}
