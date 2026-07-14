/**
 * Saldo de estoque a partir do extrato de MovimentacaoEstoque (mesma regra de
 * `sincronizarEstoquePorMovimentacao` / `recalcularEstoqueProduto`, antes do Math.max no cadastro).
 */
export function calcularSaldoMovimentacoes(movimentacoes = []) {
  return (movimentacoes || []).reduce((acc, mov) => {
    const quantidade = Number(mov.quantidade) || 0;
    if (mov.tipo === "Entrada") return acc + quantidade;
    if (mov.tipo === "Saída") return acc - quantidade;
    return acc;
  }, 0);
}

/** Preserva negativos; evita `Number(x) || 0` que mascararia só NaN (não o -1). */
export function parseEstoqueCadastro(val) {
  const n = Number(val);
  if (Number.isFinite(n)) return n;
  if (val == null || val === "") return 0;
  const s = String(val).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const m = Number(s);
  return Number.isFinite(m) ? m : 0;
}
