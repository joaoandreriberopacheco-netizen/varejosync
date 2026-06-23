#!/usr/bin/env node
/**
 * Correção retroativa recepção → estoque (opção A).
 * Detecta quantidade recebida em base (comercial × fator) vs movimentada e cria entrada complementar.
 *
 * Uso (dry-run por defeito):
 *   npm run corrigir:recepcao -- --numero=WX7-A5N
 *   npm run corrigir:recepcao -- --numero=WX7-A5N --apply
 *
 * Credenciais: VITE_BASE44_APP_ID + BASE44_ACCESS_TOKEN (ou BASE44_API_KEY) — ver AGENTS.md
 */

import { requireFlareClient } from './flare-sdk.mjs';
import { invokeRecalcularEstoqueProduto } from '../src/lib/p38StockRecalc.js';

const roundQty = (n) => Math.round((Number(n) || 0) * 1_000_000) / 1_000_000;

function parseArgs(argv) {
  const args = { numero: '', pedidoId: '', apply: false };
  for (const a of argv) {
    if (a === '--apply') args.apply = true;
    else if (a.startsWith('--numero=')) args.numero = a.slice('--numero='.length).trim();
    else if (a.startsWith('--pedido-id=')) args.pedidoId = a.slice('--pedido-id='.length).trim();
  }
  return args;
}

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

async function main() {
  const { numero, pedidoId, apply } = parseArgs(process.argv.slice(2));
  if (!numero && !pedidoId) {
    console.error('Indique --numero=WX7-A5N ou --pedido-id=<uuid>');
    process.exit(1);
  }

  const base44 = requireFlareClient();
  const pedido = await encontrarPedido(base44, { numero, pedidoId });
  if (!pedido) {
    console.error(`Pedido não encontrado (${numero || pedidoId}).`);
    process.exit(1);
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
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  if (!apply) {
    report.message = 'Dry-run: use --apply para criar entradas complementares e recalcular estoque.';
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  const obsBase = `Correção retroativa recepção→estoque (script); pedido ${pedido.numero || pedido.id}.`;
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
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
