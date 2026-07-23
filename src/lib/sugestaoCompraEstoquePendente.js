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
]);

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
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

  const statusRecebimento = normalizeStatus(pedido.status_recebimento_geral);
  const concluidoRecebimento =
    statusRecebimento.startsWith('concluído') || statusRecebimento.startsWith('concluido');
  const concluidoPedido = statusPedido === 'concluído' || statusPedido === 'concluido';

  return !concluidoRecebimento && !concluidoPedido;
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
    const itensEmbarcados = Array.isArray(embarque.itens_embarcados)
      ? embarque.itens_embarcados
      : Array.isArray(embarque.itens)
        ? embarque.itens
        : [];
    itensEmbarcados.forEach((item) => {
      const produtoId = item?.produto_id;
      if (!produtoId) return;
      const produtoKey = String(produtoId);
      acc[pedidoKey][produtoKey] =
        (acc[pedidoKey][produtoKey] || 0) + (Number(item.quantidade_recebida) || 0);
    });
    return acc;
  }, {});
}

function recebidosPorProdutoDoPedido(pedido = {}, recebidosPorPedidoProduto = {}) {
  const pedidoKey = String(pedido?.id || '');
  const externo = recebidosPorPedidoProduto[pedidoKey];
  if (externo && Object.keys(externo).length > 0) return externo;

  const embarques = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];
  return embarques.reduce((acc, embarque) => {
    const itens = embarque?.itens_embarcados || embarque?.itens || [];
    itens.forEach((item) => {
      const produtoId = item?.produto_id;
      if (!produtoId) return;
      const produtoKey = String(produtoId);
      acc[produtoKey] = (acc[produtoKey] || 0) + (Number(item.quantidade_recebida) || 0);
    });
    return acc;
  }, {});
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
