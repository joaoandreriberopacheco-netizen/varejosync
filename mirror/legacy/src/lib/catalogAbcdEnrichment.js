/**
 * Classe ABCD no catálogo — valor calculado ao vivo (enrichProdutosComIep)
 * ou trava manual no cadastro.
 */

export function resolveProdutoAbcdClasse(produto) {
  if (!produto) return '';
  if (produto.iep_trava_manual) {
    const locked = String(produto.iep_classe || produto.abcd || '').toUpperCase().trim();
    if (locked) return locked;
  }
  return String(produto.abcd || produto.iep_classe || '').toUpperCase().trim();
}

export function produtoMatchesAbcdFilter(produto, abcdFilter) {
  if (!abcdFilter || abcdFilter === 'all') return true;
  const letter = resolveProdutoAbcdClasse(produto);
  if (!letter) return false;
  return letter === String(abcdFilter).toUpperCase();
}
