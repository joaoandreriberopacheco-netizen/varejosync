/**
 * Classe ABCD no catálogo — contingência: cálculo ao vivo (90d) + fallback no cadastro.
 */

import {
  abcdClasseParaProdutoId,
  calcularMapaAbcdPorProduto,
} from '@/lib/calcularIepProdutos';

const ABCD_BADGE_CLASS = {
  A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  B: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  C: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  D: 'bg-muted text-muted-foreground',
};

export function enrichProdutosComAbcdAoVivo(produtos, itensPorProduto) {
  const lista = Array.isArray(produtos) ? produtos : [];
  if (!lista.length || !itensPorProduto) return lista;

  const { mapaAbcdProduto } = calcularMapaAbcdPorProduto(lista, itensPorProduto);

  return lista.map((produto) => {
    const pid = String(produto.id);
    const aoVivo = abcdClasseParaProdutoId(pid, mapaAbcdProduto);
    const cadastro = String(produto.abcd || produto.iep_classe || '').toUpperCase().trim();

    if (produto.iep_trava_manual && cadastro) {
      return {
        ...produto,
        abcd_ao_vivo: aoVivo,
        abcd_cadastro: cadastro,
        abcd: cadastro,
        abcd_fonte: 'manual',
      };
    }

    return {
      ...produto,
      abcd_ao_vivo: aoVivo,
      abcd_cadastro: cadastro || null,
      abcd: aoVivo,
      abcd_fonte: 'ao_vivo',
    };
  });
}

export function resolveProdutoAbcdClasse(produto) {
  if (!produto) return '';
  if (produto.iep_trava_manual) {
    const locked = String(produto.iep_classe || produto.abcd || '').toUpperCase().trim();
    if (locked) return locked;
  }
  return String(produto.abcd || produto.abcd_ao_vivo || produto.iep_classe || '')
    .toUpperCase()
    .trim();
}

export function produtoMatchesAbcdFilter(produto, abcdFilter) {
  if (!abcdFilter || abcdFilter === 'all') return true;
  const letter = resolveProdutoAbcdClasse(produto);
  if (!letter) return false;
  return letter === String(abcdFilter).toUpperCase();
}

export function abcdBadgeClassName(letter) {
  const key = String(letter || '').toUpperCase();
  return ABCD_BADGE_CLASS[key] || ABCD_BADGE_CLASS.D;
}
