#!/usr/bin/env node
/**
 * Audita pendência de estoque na Sugestão de Compra para um pedido/embarque.
 *
 * Uso:
 *   npm run audit:pedido-sugestao -- --codigo=E62-67G
 *   npm run audit:pedido-sugestao -- --numero=E62
 */
import { requireBase44Client } from './base44-env.mjs';
import { fetchPedidosCompraParaSugestaoEstoque, parsePedidoNumeroBase } from '../src/lib/fetchPedidosCompraParaSugestaoEstoque.js';
import {
  buildPendenteAprovadoFinanceiroPorProduto,
  pedidoCompraAprovadoNaoConcluido,
  pedidoCompraEstaConcluido,
  resolveQuantidadeBaseItemEmbarque,
  resolveQuantidadeBaseItemPedido,
} from '../src/lib/sugestaoCompraEstoquePendente.js';

function parseArgs(argv) {
  const codigoArg = argv.find((a) => a.startsWith('--codigo='));
  const numeroArg = argv.find((a) => a.startsWith('--numero='));
  const codigo = codigoArg?.slice('--codigo='.length) || '';
  const numero = numeroArg?.slice('--numero='.length) || parsePedidoNumeroBase(codigo);
  if (!numero) {
    console.error('Uso: npm run audit:pedido-sugestao -- --codigo=E62-67G');
    console.error('     npm run audit:pedido-sugestao -- --numero=E62');
    process.exit(1);
  }
  return { codigo, numero };
}

function normalizeNumero(value = '') {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}

function getEmbarqueSuffix(codigo = '') {
  const match = String(codigo || '').trim().match(/-([A-Z0-9]+)$/i);
  return match?.[1]?.toUpperCase() || '';
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function resolveEmbarquePorSuffix(embarques = [], suffix = '') {
  if (!suffix) return null;
  const idx = LETTERS.indexOf(suffix);
  if (idx < 0) return null;
  const ordenados = [...embarques].sort(
    (a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0),
  );
  return ordenados[idx] || null;
}

async function main() {
  const { codigo, numero } = parseArgs(process.argv.slice(2));
  const base44 = requireBase44Client();

  const pedidos = await base44.entities.PedidoCompra.filter({ numero }).catch(() => []);
  const pedido = (pedidos || []).find((row) => normalizeNumero(row?.numero) === normalizeNumero(numero));
  if (!pedido?.id) {
    console.error(`Pedido ${numero} não encontrado.`);
    process.exit(1);
  }

  const embarquesPedido = await base44.entities.Embarque.filter({ pedido_compra_id: pedido.id }).catch(() => []);
  const suffix = getEmbarqueSuffix(codigo);
  const embarqueAlvo = resolveEmbarquePorSuffix(embarquesPedido, suffix);

  const snapshot = await fetchPedidosCompraParaSugestaoEstoque(base44);
  const pedidoSnapshot = snapshot.pedidosTodos.find((row) => row.id === pedido.id) || pedido;
  const pendingMap = buildPendenteAprovadoFinanceiroPorProduto(
    snapshot.pedidosAbertos,
    snapshot.recebidosPorPedidoProduto,
    { embarques: snapshot.embarques, pedidosParaEmbarque: snapshot.pedidosTodos },
  );

  const itensEmbarque = embarqueAlvo?.itens_embarcados || embarqueAlvo?.itens || [];
  const linhasEmbarque = itensEmbarque.map((item) => {
    const pedidoItem = (pedidoSnapshot.itens || []).find((linha) => linha.produto_id === item.produto_id);
    const embarcadoBase = resolveQuantidadeBaseItemEmbarque(item, pedidoItem);
    const pendenteMap = Number(pendingMap[String(item.produto_id)] || 0);
    return {
      produto_id: item.produto_id,
      produto_nome: item.produto_nome || pedidoItem?.produto_nome || '',
      quantidade_embarcada: Number(item.quantidade_embarcada) || 0,
      quantidade_recebida: Number(item.quantidade_recebida) || 0,
      quantidade_base_embarque: embarcadoBase,
      pendente_map_total: pendenteMap,
    };
  });

  const linhasPedido = (pedidoSnapshot.itens || []).map((item) => ({
    produto_id: item.produto_id,
    produto_nome: item.produto_nome,
    quantidade_comercial: Number(item.quantidade) || 0,
    quantidade_base: resolveQuantidadeBaseItemPedido(item),
    pendente_map_total: Number(pendingMap[String(item.produto_id)] || 0),
  }));

  const report = {
    codigo,
    pedido: {
      id: pedidoSnapshot.id,
      numero: pedidoSnapshot.numero,
      status: pedidoSnapshot.status,
      status_aprovacao_financeira: pedidoSnapshot.status_aprovacao_financeira,
      status_recebimento_geral: pedidoSnapshot.status_recebimento_geral,
      aprovado_nao_concluido: pedidoCompraAprovadoNaoConcluido(pedidoSnapshot),
      concluido: pedidoCompraEstaConcluido(pedidoSnapshot),
      qtd_itens: (pedidoSnapshot.itens || []).length,
    },
    embarque: embarqueAlvo
      ? {
          id: embarqueAlvo.id,
          suffix,
          status: embarqueAlvo.status,
          status_recebimento: embarqueAlvo.status_recebimento,
          qtd_itens: itensEmbarque.length,
          linhas: linhasEmbarque,
        }
      : null,
    pedido_linhas: linhasPedido,
    snapshot: {
      pedidos_todos: snapshot.pedidosTodos.length,
      pedidos_abertos: snapshot.pedidosAbertos.length,
      embarques: snapshot.embarques.length,
      pedido_no_snapshot: snapshot.pedidosTodos.some((row) => row.id === pedido.id),
      pedido_aberto_no_snapshot: snapshot.pedidosAbertos.some((row) => row.id === pedido.id),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
