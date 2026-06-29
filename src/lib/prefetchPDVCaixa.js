/** Pré-carrega o chunk do PDV Caixa (partilhado entre lazy() e atalho lateral). */
let prefetchPromise = null;

export function prefetchPDVCaixa() {
  if (!prefetchPromise) {
    prefetchPromise = import('@/components/vendas/PDVCaixa');
  }
  return prefetchPromise;
}
