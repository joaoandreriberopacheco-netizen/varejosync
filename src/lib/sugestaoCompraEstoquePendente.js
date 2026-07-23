import { pedidoLiberadoParaLogistica } from '@/lib/aprovarPedidoCompraFinanceiro';

export function pedidoCompraNaoConcluido(pedido = {}) {
  const status = String(pedido?.status || '').trim();
  const statusReceb = String(pedido?.status_recebimento_geral || '').trim();
  if (status === 'Concluído' || status === 'Concluido') return false;
  if (statusReceb.startsWith('Concluído') || statusReceb.startsWith('Concluido')) return false;
  return true;
}

/** Pedido com aprovação financeira e ainda sem conclusão de recebimento. */
export function pedidoCompraAprovadoFinanceiroNaoConcluido(pedido = {}) {
  return pedidoLiberadoParaLogistica(pedido) && pedidoCompraNaoConcluido(pedido);
}

function recebidosPorProdutoDoPedido(pedido = {}) {
  const embarques = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];
  return embarques.reduce((acc, embarque) => {
    const itens = embarque?.itens_embarcados || embarque?.itens || [];
    itens.forEach((item) => {
      const produtoId = item?.produto_id;
      if (!produtoId) return;
      acc[produtoId] = (acc[produtoId] || 0) + (Number(item.quantidade_recebida) || 0);
    });
    return acc;
  }, {});
}

export function quantidadePendenteItemPedidoCompra(item = {}, recebidosPorProduto = {}) {
  const produtoId = item?.produto_id;
  const quantidadeItem = Number(item.quantidade_base || item.quantidade) || 0;
  const quantidadeRecebida = produtoId ? Number(recebidosPorProduto[produtoId] || 0) : 0;
  return Math.max(0, quantidadeItem - quantidadeRecebida);
}

/** Soma por produto o que falta receber em pedidos aprovados financeiramente e não concluídos. */
export function buildPendenteAprovadoFinanceiroPorProduto(pedidos = []) {
  const map = {};
  (pedidos || []).forEach((pedido) => {
    if (!pedidoCompraAprovadoFinanceiroNaoConcluido(pedido)) return;
    const recebidos = recebidosPorProdutoDoPedido(pedido);
    (pedido.itens || []).forEach((item) => {
      const produtoId = item?.produto_id;
      if (!produtoId) return;
      const pendente = quantidadePendenteItemPedidoCompra(item, recebidos);
      if (pendente > 0) {
        map[produtoId] = (map[produtoId] || 0) + pendente;
      }
    });
  });
  return map;
}

export function aplicarPendenteAprovadoNoEstoqueProdutos(produtos = [], pendentePorProduto = {}) {
  return (produtos || []).map((produto) => {
    const pendente = Number(pendentePorProduto[produto?.id]) || 0;
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
