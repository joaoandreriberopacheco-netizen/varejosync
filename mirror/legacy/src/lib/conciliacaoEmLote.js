import { roundToTwoDecimals } from '@/lib/financialUtils';

/** Tamanho máximo de operações paralelas por lote (limite Base44). */
export const CONCILIACAO_LOTE_TAMANHO = 25;

/** Agrupa lançamentos pela conta financeira vinculada. */
export function agruparPorContaFinanceira(itens) {
  const mapa = {};
  for (const item of itens) {
    const contaId = item.conta_financeira_id || '_sem_conta';
    if (!mapa[contaId]) mapa[contaId] = [];
    mapa[contaId].push(item);
  }
  return mapa;
}

/**
 * Calcula valor reconciliado e status (Conciliado/Ajustado) para um item.
 */
export function calcularValorReconciliadoItem(item, valorReal, totalEsperado) {
  const valorItem = roundToTwoDecimals(item.valor_liquido ?? item.valor ?? 0);
  if (!totalEsperado || Math.abs(valorReal - totalEsperado) <= 0.01) {
    return { valor: valorItem, status: 'Conciliado' };
  }
  const valorAjustado = roundToTwoDecimals(valorItem * (valorReal / totalEsperado));
  const status = Math.abs(valorAjustado - valorItem) > 0.01 ? 'Ajustado' : 'Conciliado';
  return { valor: valorAjustado, status };
}

/**
 * Delta de saldo ao conciliar: só credita/debita se o lançamento ainda não estava Pago.
 */
export function deltaSaldoConciliacao(lancamento, valorReconciliado) {
  if (lancamento.status === 'Pago' || lancamento.data_pagamento) return 0;
  if (lancamento.tipo === 'Receita') return valorReconciliado;
  if (lancamento.tipo === 'Despesa') return -valorReconciliado;
  return 0;
}

/**
 * Processa itens em lotes sequenciais; dentro de cada lote, executa em paralelo.
 * @returns {Promise<{ erros: Array<{ item: unknown, erro: unknown }>, sucessos: unknown[] }>}
 */
export async function processarEmLotes(itens, tamanhoLote, processarItem, onProgress) {
  const erros = [];
  const sucessos = [];
  let processados = 0;
  for (let i = 0; i < itens.length; i += tamanhoLote) {
    const lote = itens.slice(i, i + tamanhoLote);
    const resultados = await Promise.allSettled(lote.map(processarItem));
    resultados.forEach((resultado, idx) => {
      if (resultado.status === 'rejected') {
        erros.push({ item: lote[idx], erro: resultado.reason });
      } else {
        sucessos.push(lote[idx]);
      }
    });
    processados += lote.length;
    onProgress?.(processados, itens.length);
  }
  return { erros, sucessos };
}
