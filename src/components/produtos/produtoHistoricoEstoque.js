/**
 * Extrato de estoque: saldo após cada movimentação reconciliado com estoque_atual do produto.
 */

/** Delta em unidades (positivo = entrada no estoque). */
export function deltaQuantidadeMovimento(mov) {
  const q = Number(mov?.quantidade) || 0;
  const t = mov?.tipo;
  if (t === 'Entrada') return q;
  if (t === 'Saída') return -q;
  return 0;
}

export function ordenarMovimentacoesCronologico(movimentacoes) {
  return [...(movimentacoes || [])].sort((a, b) => {
    const ta = new Date(a?.created_date || 0).getTime();
    const tb = new Date(b?.created_date || 0).getTime();
    if (ta !== tb) return ta - tb;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });
}

/**
 * @returns {{
 *   linhas: { mov: object, saldoApos: number }[],
 *   saldoInicial: number,
 *   somaDeltas: number,
 *   estoqueReconciliado: number,
 *   divergencia: number,
 * }}
 */
export function calcularExtratoComSaldo(movimentacoes, estoqueAtual) {
  const ordenadas = ordenarMovimentacoesCronologico(movimentacoes);
  let somaDeltas = 0;
  for (const m of ordenadas) {
    somaDeltas += deltaQuantidadeMovimento(m);
  }
  const atual = Number(estoqueAtual) || 0;
  const saldoInicial = atual - somaDeltas;

  const linhas = [];
  let acumulado = saldoInicial;
  for (const m of ordenadas) {
    acumulado += deltaQuantidadeMovimento(m);
    linhas.push({ mov: m, saldoApos: acumulado });
  }

  const divergencia = Math.abs(acumulado - atual) > 0.0001 ? acumulado - atual : 0;

  return {
    linhas,
    saldoInicial,
    somaDeltas,
    estoqueReconciliado: atual,
    divergencia,
  };
}

export function textoReferenciaTipo(mov) {
  return mov?.referencia_tipo || mov?.motivo || mov?.tipo || '—';
}

export function movimentacaoPassaFiltros(mov, { busca, tipoFiltro, refTipo, dataIni, dataFim }) {
  const q = (busca || '').trim().toLowerCase();
  if (q) {
    const blob = [
      mov?.referencia_numero,
      mov?.documento_referencia,
      mov?.referencia_id,
      mov?.cliente_nome,
      mov?.terceiro_nome,
      mov?.referencia_cliente_nome,
      mov?.produto_nome,
      mov?.referencia_tipo,
      mov?.motivo,
      mov?.usuario_responsavel,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!blob.includes(q)) return false;
  }

  if (tipoFiltro === 'Entrada' && mov?.tipo !== 'Entrada') return false;
  if (tipoFiltro === 'Saída' && mov?.tipo !== 'Saída') return false;

  if (refTipo && refTipo !== 'todos' && (mov?.referencia_tipo || '') !== refTipo) return false;

  if (dataIni) {
    const d = new Date(mov?.created_date);
    const i = new Date(`${dataIni}T00:00:00`);
    if (d < i) return false;
  }
  if (dataFim) {
    const d = new Date(mov?.created_date);
    const f = new Date(`${dataFim}T23:59:59.999`);
    if (d > f) return false;
  }

  return true;
}
