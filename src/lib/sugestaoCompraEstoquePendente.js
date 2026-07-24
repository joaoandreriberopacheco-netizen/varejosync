import { pedidoLiberadoParaLogistica } from '@/lib/aprovarPedidoCompraFinanceiro';

const PEDIDO_COMPRA_APPROVED_STATUSES = new Set([
  'aprovado financeiramente',
  'aprovado',
]);

const PEDIDO_STATUS_LOGISTICA_EM_ABERTO = new Set([
  'aprovado',
  'aguardando recepção',
  'aguardando recepcao',
  'aguardando embarque',
  'enviado',
  'despachado',
  'em recepção',
  'em recepcao',
  'em trânsito',
  'em transito',
  'recebido parcialmente',
  'recebido parcial',
  'pendência',
  'pendencia',
]);

const PEDIDO_STATUS_EXCLUIDOS_ESTOQUE = new Set([
  'rascunho',
  'cancelado',
  'rejeitado financeiramente',
  'rejeitado',
  'concluido',
  'devolvido',
]);

function normalizeStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function resolveQuantidadeRecebidaItemEmbarque(item = {}, embarque = {}) {
  const recebida = Number(item.quantidade_recebida) || 0;
  if (recebida > 0) return recebida;

  const statusReceb = normalizeStatus(embarque?.status_recebimento);
  const statusEmbarque = normalizeStatus(embarque?.status);
  const embarqueConcluido =
    statusReceb === 'recebido ok' ||
    statusReceb === 'com divergencia' ||
    statusEmbarque === 'concluido';

  if (!embarqueConcluido) return 0;

  return (
    Number(item.quantidade_embarcada) ||
    Number(item.quantidade_pedida) ||
    Number(item.quantidade) ||
    0
  );
}

function somarRecebidosItensEmbarque(acc, embarque = {}) {
  const itensEmbarcados = Array.isArray(embarque.itens_embarcados)
    ? embarque.itens_embarcados
    : Array.isArray(embarque.itens)
      ? embarque.itens
      : [];
  itensEmbarcados.forEach((item) => {
    const produtoId = item?.produto_id;
    if (!produtoId) return;
    const produtoKey = String(produtoId);
    const qty = resolveQuantidadeRecebidaItemEmbarque(item, embarque);
    if (qty > 0) {
      acc[produtoKey] = (acc[produtoKey] || 0) + qty;
    }
  });
  return acc;
}

/** Pedido encerrado para efeito de estoque projetado (não soma pendente). */
export function pedidoCompraEstaConcluido(pedido = {}) {
  const statusDisplay = String(pedido.status || '').trim();
  const statusPedido = normalizeStatus(statusDisplay);
  if (PEDIDO_STATUS_EXCLUIDOS_ESTOQUE.has(statusPedido)) return true;

  const statusRecebDisplay = String(pedido.status_recebimento_geral || '').trim();
  const statusRecebimento = normalizeStatus(statusRecebDisplay);
  if (
    statusRecebDisplay.startsWith('Concluído') ||
    statusRecebDisplay.startsWith('Concluido') ||
    statusRecebimento.startsWith('concluido') ||
    statusRecebimento === 'recebido ok' ||
    statusRecebimento === 'concluido ok' ||
    statusRecebimento.includes('concluido com divergencia')
  ) {
    return true;
  }

  return false;
}

export function pedidoCompraTotalmenteRecebido(pedido = {}, recebidosPorProduto = {}) {
  const itens = Array.isArray(pedido?.itens) ? pedido.itens : [];
  if (!itens.length) return false;
  return itens.every(
    (item) => quantidadePendenteItemPedidoCompra(item, recebidosPorProduto) <= 0,
  );
}

function resolveQuantidadeBaseItemPedido(item = {}) {
  const base = Number(item.quantidade_base);
  if (Number.isFinite(base) && base > 0) return base;
  const qtd = Number(item.quantidade) || 0;
  const fator = Number(item.fator_conversao) || 1;
  return qtd * fator;
}

/** Mesma regra do dashboard de estoque: aprovado financeiramente e ainda não concluído. */
export function pedidoCompraAprovadoNaoConcluido(pedido = {}) {
  if (pedidoCompraEstaConcluido(pedido)) return false;

  const statusDisplay = String(pedido.status || '').trim();
  const statusPedido = normalizeStatus(statusDisplay);
  if (PEDIDO_STATUS_EXCLUIDOS_ESTOQUE.has(statusPedido)) return false;

  const ehAguardandoPagamento = [
    'Aguardando Aprovação Financeira',
    'Aguardando Liberação Financeira',
    'Aguardando Liberação',
    'Aguardando',
  ].includes(statusDisplay);
  if (ehAguardandoPagamento) return false;

  const statusAprovacao = normalizeStatus(pedido.status_aprovacao_financeira || '');
  const aprovadoViaStatus = pedidoLiberadoParaLogistica(pedido);
  const aprovado =
    PEDIDO_COMPRA_APPROVED_STATUSES.has(statusAprovacao) ||
    PEDIDO_STATUS_LOGISTICA_EM_ABERTO.has(statusAprovacao) ||
    PEDIDO_STATUS_LOGISTICA_EM_ABERTO.has(statusPedido);
  if (!aprovado && !aprovadoViaStatus) return false;

  return true;
}

/** @deprecated use pedidoCompraAprovadoNaoConcluido */
export function pedidoCompraAprovadoFinanceiroNaoConcluido(pedido = {}) {
  return pedidoCompraAprovadoNaoConcluido(pedido);
}

export function buildRecebidosPorPedidoProdutoFromEmbarques(embarques = []) {
  return (embarques || []).reduce((acc, embarque) => {
    const pedidoId = embarque?.pedido_compra_id;
    if (!pedidoId) return acc;
    const pedidoKey = String(pedidoId);
    if (!acc[pedidoKey]) acc[pedidoKey] = {};
    somarRecebidosItensEmbarque(acc[pedidoKey], embarque);
    return acc;
  }, {});
}

function recebidosEmbeddedNoPedido(pedido = {}) {
  const embarques = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];
  return embarques.reduce((acc, embarque) => somarRecebidosItensEmbarque(acc, embarque), {});
}

function mergeRecebidosPorProduto(externo = {}, interno = {}) {
  const out = { ...interno };
  for (const [key, qty] of Object.entries(externo)) {
    out[key] = Math.max(Number(out[key] || 0), Number(qty) || 0);
  }
  return out;
}

function recebidosPorProdutoDoPedido(pedido = {}, recebidosPorPedidoProduto = {}) {
  const pedidoKey = String(pedido?.id || '');
  const externo = recebidosPorPedidoProduto[pedidoKey] || {};
  const interno = recebidosEmbeddedNoPedido(pedido);
  return mergeRecebidosPorProduto(externo, interno);
}

export function quantidadePendenteItemPedidoCompra(item = {}, recebidosPorProduto = {}) {
  const produtoId = item?.produto_id;
  const produtoKey = produtoId ? String(produtoId) : '';
  const quantidadeItem = resolveQuantidadeBaseItemPedido(item);
  const quantidadeRecebida = produtoKey ? Number(recebidosPorProduto[produtoKey] || 0) : 0;
  return Math.max(0, quantidadeItem - quantidadeRecebida);
}

/** Soma por produto o que falta receber em pedidos aprovados financeiramente e não concluídos. */
export function buildPendenteAprovadoFinanceiroPorProduto(
  pedidos = [],
  recebidosPorPedidoProduto = {},
) {
  const map = {};
  (pedidos || []).forEach((pedido) => {
    if (!pedidoCompraAprovadoNaoConcluido(pedido)) return;
    const recebidos = recebidosPorProdutoDoPedido(pedido, recebidosPorPedidoProduto);
    if (pedidoCompraTotalmenteRecebido(pedido, recebidos)) return;
    (pedido.itens || []).forEach((item) => {
      const produtoId = item?.produto_id;
      if (!produtoId) return;
      const produtoKey = String(produtoId);
      const pendente = quantidadePendenteItemPedidoCompra(item, recebidos);
      if (pendente > 0) {
        map[produtoKey] = (map[produtoKey] || 0) + pendente;
      }
    });
  });
  return map;
}

export function resolvePendentePorProduto(pendentePorProduto = {}, produtoId) {
  if (!produtoId) return 0;
  return Number(pendentePorProduto[produtoId] ?? pendentePorProduto[String(produtoId)]) || 0;
}

/** estoque_atual efetivo = físico + pendente aprovado (quando o toggle está ligado). */
export function aplicarPendenteAprovadoNoEstoqueProdutos(produtos = [], pendentePorProduto = {}) {
  return (produtos || []).map((produto) => {
    const pendente = resolvePendentePorProduto(pendentePorProduto, produto?.id);
    if (pendente <= 0) return produto;
    const estoqueFisico = Number(produto.estoque_atual) || 0;
    return {
      ...produto,
      estoque_atual: estoqueFisico + pendente,
      estoque_fisico: estoqueFisico,
      estoque_pedidos_aprovados: pendente,
    };
  });
}
