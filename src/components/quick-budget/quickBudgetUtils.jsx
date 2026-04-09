export function formatCurrency(value) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getProductSearchText(produto) {
  return [
    produto.nome,
    produto.codigo_interno,
    produto.codigo_barras,
    produto.campo_hierarquico_1,
    produto.campo_hierarquico_2,
    produto.campo_hierarquico_3,
    produto.campo_hierarquico_4,
    produto.campo_hierarquico_5,
    produto.marca,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function getMinimumPrice(produto) {
  return Number(produto?.preco_custo_calculado || 0);
}

export function getFullPrice(produto) {
  return Number(produto?.preco_venda_padrao || 0);
}

export function buildQuickBudgetItem(produto) {
  const precoCheio = getFullPrice(produto);
  const precoMinimo = getMinimumPrice(produto);
  const quantidade = 1;
  return {
    produto_id: produto.id,
    produto_nome: produto.nome,
    codigo_interno: produto.codigo_interno || '',
    estoque_atual: Number(produto.estoque_atual || 0),
    preco_cheio: precoCheio,
    preco_minimo: precoMinimo,
    preco_unitario: precoCheio,
    quantidade,
    total: precoCheio * quantidade,
  };
}

export function recalculateItem(item) {
  const quantidade = Number(item.quantidade || 0);
  const preco = Number(item.preco_unitario || 0);
  return {
    ...item,
    quantidade,
    preco_unitario: preco,
    total: quantidade * preco,
  };
}

export function matchesProduct(produto, query) {
  if (!query?.trim()) return true;
  const searchable = getProductSearchText(produto);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((word) => searchable.includes(word));
}

export function getBudgetSummary(items) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  return {
    subtotal,
    total: subtotal,
    quantidadeItens: items.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0),
  };
}