/**
 * Saldo de estoque ao fim de cada dia (para média de vendas excluindo dias sem estoque).
 */

import { deltaQuantidadeMovimento, ordenarMovimentacoesCronologico } from '@/components/produtos/produtoHistoricoEstoque';

function localDateKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'sem-data';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Lista de chaves yyyy-MM-dd de `inicio` até `fim` (inclusive). */
export function iterarDiasCalendario(inicio, fim) {
  const dias = [];
  let cur = new Date(inicio);
  cur.setHours(12, 0, 0, 0);
  const end = new Date(fim);
  end.setHours(12, 0, 0, 0);
  while (cur <= end) {
    dias.push(localDateKey(cur));
    cur = addDays(cur, 1);
  }
  return dias;
}

/**
 * Saldo ao fim de cada dia na janela.
 * Dias sem movimento repetem o saldo do dia anterior.
 * @returns {Map<string, number>}
 */
export function buildMapaSaldoFimDia(movimentacoes, estoqueAtual, janelaDias = 90) {
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const inicio = addDays(hoje, -janelaDias);
  const diaInicio = localDateKey(inicio);
  const diasJanela = iterarDiasCalendario(inicio, hoje);

  const movsJanela = (Array.isArray(movimentacoes) ? movimentacoes : []).filter((m) => {
    const dia = localDateKey(m?.created_date);
    return dia !== 'sem-data' && dia >= diaInicio;
  });

  const deltasNaJanela = movsJanela.reduce((acc, m) => acc + deltaQuantidadeMovimento(m), 0);
  let saldo = (Number(estoqueAtual) || 0) - deltasNaJanela;

  const movsPorDia = new Map();
  for (const m of ordenarMovimentacoesCronologico(movsJanela)) {
    const dia = localDateKey(m?.created_date);
    if (!movsPorDia.has(dia)) movsPorDia.set(dia, []);
    movsPorDia.get(dia).push(m);
  }

  const saldoPorDia = new Map();
  for (const dia of diasJanela) {
    const movsDia = movsPorDia.get(dia) || [];
    for (const m of movsDia) {
      saldo += deltaQuantidadeMovimento(m);
    }
    saldoPorDia.set(dia, saldo);
  }

  return saldoPorDia;
}

/** Dias com saldo ≠ 0 (negativo conta). */
export function contarDiasComEstoqueAtivo(saldoPorDia) {
  if (!saldoPorDia || saldoPorDia.size === 0) return 0;
  let count = 0;
  for (const saldo of saldoPorDia.values()) {
    if (saldo !== 0) count += 1;
  }
  return count;
}
