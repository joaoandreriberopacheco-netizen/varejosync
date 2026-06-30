/**
 * Classe ABCD no catálogo — campo estático gravado no produto.
 *
 * A curva é calculada pelo job `calcularIEP` (madrugada), que persiste
 * `abcd`, `iep_classe` e scores no cadastro. O catálogo só lê esses valores;
 * não recalcula vendas de 90 dias (isso fica nos relatórios IEP sob demanda).
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
