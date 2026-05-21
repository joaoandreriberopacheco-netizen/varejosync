/**
 * Pares de troca no caixa: venda substituída (não soma no total) ↔ venda substituta (conta).
 * Detecção: substitui_pedido_* no pedido, vale com pedido_origem, devolução com pedido_substituto_* ou aguarda_substituto.
 */

export function dataCivilISO(dateLike) {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function mesmoDiaCivil(a, b) {
  const da = dataCivilISO(a);
  const db = dataCivilISO(b);
  return da && db && da === db;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function valorPedido(v) {
  return Number(v?.valor_total ?? v?.total ?? 0) || 0;
}

function pagamentoVale(pedido) {
  return (pedido.pagamentos || []).find((p) => {
    const fp = (p.forma_pagamento || '').toLowerCase();
    return fp.includes('vale') && (p.vale_id || p.vale_codigo);
  });
}

function chavePar(origemId, substitutoId) {
  return `${origemId}::${substitutoId}`;
}

/**
 * @param {object} params
 * @param {object[]} params.vendas - Pedidos do turno ou do dia
 * @param {object[]} [params.vales]
 * @param {object[]} [params.devolucoes]
 */
export function buildSubstituicoesVendaCaixa({ vendas = [], vales = [], devolucoes = [] }) {
  const vendasById = new Map(vendas.map((v) => [v.id, v]));
  const vendasByNumero = new Map(
    vendas.filter((v) => v.numero).map((v) => [String(v.numero).toUpperCase(), v])
  );
  const valesById = new Map(vales.map((v) => [v.id, v]));

  const pares = [];
  const parKeys = new Set();
  const idsSubstituidos = new Set();
  const idsSubstitutos = new Set();

  const addPar = (origem, substituto, extra = {}) => {
    if (!origem?.id || !substituto?.id || origem.id === substituto.id) return;
    const key = chavePar(origem.id, substituto.id);
    if (parKeys.has(key)) return;
    parKeys.add(key);
    const valorOrigem = valorPedido(origem);
    const valorSubstituto = valorPedido(substituto);
    pares.push({
      origem,
      substituto,
      valorOrigem,
      valorSubstituto,
      diferenca: round2(valorSubstituto - valorOrigem),
      ...extra,
    });
    idsSubstituidos.add(origem.id);
    idsSubstitutos.add(substituto.id);
  };

  // 1) Campo explícito no pedido substituto
  for (const substituto of vendas) {
    const origemId = substituto.substitui_pedido_id;
    const origemNumero = substituto.substitui_pedido_numero;
    let origem = origemId ? vendasById.get(origemId) : null;
    if (!origem && origemNumero) {
      origem = vendasByNumero.get(String(origemNumero).toUpperCase());
    }
    if (origem && mesmoDiaCivil(origem.created_date, substituto.created_date)) {
      addPar(origem, substituto, { fonte: 'pedido' });
    }
  }

  // 2) Vale troca no pagamento
  for (const substituto of vendas) {
    if (idsSubstitutos.has(substituto.id)) continue;
    const pag = pagamentoVale(substituto);
    if (!pag?.vale_id) continue;
    const vale = valesById.get(pag.vale_id);
    if (!vale?.pedido_origem_id) continue;
    let origem = vendasById.get(vale.pedido_origem_id);
    if (!origem && vale.pedido_origem_numero) {
      origem = vendasByNumero.get(String(vale.pedido_origem_numero).toUpperCase());
    }
    if (!origem) continue;
    if (!mesmoDiaCivil(origem.created_date, substituto.created_date)) continue;
    addPar(origem, substituto, { fonte: 'vale', valeCodigo: vale.codigo });
  }

  // 3) Devolução com substituto já gravado
  for (const dt of devolucoes) {
    if (!dt.pedido_substituto_id && !dt.pedido_substituto_numero) continue;
    let substituto = dt.pedido_substituto_id
      ? vendasById.get(dt.pedido_substituto_id)
      : null;
    if (!substituto && dt.pedido_substituto_numero) {
      substituto = vendasByNumero.get(String(dt.pedido_substituto_numero).toUpperCase());
    }
    let origem = dt.pedido_origem_id ? vendasById.get(dt.pedido_origem_id) : null;
    if (!origem && dt.pedido_origem_numero) {
      origem = vendasByNumero.get(String(dt.pedido_origem_numero).toUpperCase());
    }
    if (!origem || !substituto) continue;
    if (!mesmoDiaCivil(origem.created_date, substituto.created_date)) continue;
    addPar(origem, substituto, { fonte: 'devolucao', devolucaoNumero: dt.numero });
  }

  // 4) Devolução aguardando substituto — um único candidato no mesmo dia (mesmo cliente se houver)
  for (const dt of devolucoes) {
    if (!dt.aguarda_substituto || dt.pedido_substituto_id) continue;
    const origem = dt.pedido_origem_id
      ? vendasById.get(dt.pedido_origem_id)
      : vendasByNumero.get(String(dt.pedido_origem_numero || '').toUpperCase());
    if (!origem || idsSubstituidos.has(origem.id)) continue;

    const dtTime = new Date(dt.created_date || 0).getTime();
    const candidatos = vendas.filter((v) => {
      if (v.id === origem.id || idsSubstitutos.has(v.id)) return false;
      if (!mesmoDiaCivil(v.created_date, origem.created_date)) return false;
      if (new Date(v.created_date || 0).getTime() < dtTime) return false;
      if (dt.cliente_id && v.cliente_id && v.cliente_id !== dt.cliente_id) return false;
      return true;
    });

    if (candidatos.length === 1) {
      addPar(origem, candidatos[0], { fonte: 'aguarda_substituto', devolucaoNumero: dt.numero });
    }
  }

  const metaPorPedidoId = {};
  for (const par of pares) {
    metaPorPedidoId[par.origem.id] = {
      papel: 'substituida',
      par,
      substituto: par.substituto,
      diferenca: par.diferenca,
    };
    metaPorPedidoId[par.substituto.id] = {
      papel: 'substituto',
      par,
      origem: par.origem,
      diferenca: par.diferenca,
    };
  }

  for (const v of vendas) {
    if (!metaPorPedidoId[v.id]) {
      metaPorPedidoId[v.id] = { papel: 'normal' };
    }
  }

  const totalVendasBruto = round2(vendas.reduce((s, v) => s + valorPedido(v), 0));
  const totalVendasUtil = round2(
    vendas
      .filter((v) => !idsSubstituidos.has(v.id))
      .reduce((s, v) => s + valorPedido(v), 0)
  );
  const valorSubstituidoNaoSoma = round2(totalVendasBruto - totalVendasUtil);

  const vendasParaExibicao = vendas.filter((v) => !idsSubstituidos.has(v.id));

  return {
    pares,
    idsSubstituidos,
    idsSubstitutos,
    metaPorPedidoId,
    totalVendasBruto,
    totalVendasUtil,
    valorSubstituidoNaoSoma,
    qtdSubstituicoes: pares.length,
    vendasParaExibicao,
  };
}

export function formatarDiferencaSubstituicao(diferenca, formatValor) {
  const d = round2(diferenca);
  if (d === 0) return formatValor(0);
  const sign = d > 0 ? '+' : '-';
  return `${sign}${formatValor(Math.abs(d))}`;
}
