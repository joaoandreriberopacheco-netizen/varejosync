/**
 * Pares de troca no caixa: venda substituída (não soma no total) ↔ venda substituta (conta).
 * Detecção: substitui_pedido_* no pedido, vale (id/código/histórico), devolução do dia.
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

function normCodigo(c) {
  return String(c || '').trim().toUpperCase();
}

function pagamentoVale(pedido) {
  return (pedido.pagamentos || []).find((p) => {
    const fp = (p.forma_pagamento || '').toLowerCase();
    return fp.includes('vale') && (p.vale_id || p.vale_codigo);
  });
}

function getHistoricoUso(vale) {
  if (!vale) return [];
  const raw = vale.historico_uso ?? vale.extras?.historico_uso ?? vale.dados?.historico_uso;
  return Array.isArray(raw) ? raw : [];
}

function resolveVale(pag, valesById, valesByCodigo) {
  if (!pag) return null;
  if (pag.vale_id) {
    const v = valesById.get(pag.vale_id);
    if (v) return v;
  }
  if (pag.vale_codigo) {
    return valesByCodigo.get(normCodigo(pag.vale_codigo)) || null;
  }
  return null;
}

function resolveValeDevolucao(dt, valesById, valesByCodigo) {
  if (dt.vale_compra_id) {
    const v = valesById.get(dt.vale_compra_id);
    if (v) return v;
  }
  if (dt.vale_compra_codigo) {
    return valesByCodigo.get(normCodigo(dt.vale_compra_codigo)) || null;
  }
  return null;
}

function mesmoClienteContexto(dt, venda) {
  if (dt.cliente_id && venda.cliente_id) return dt.cliente_id === venda.cliente_id;
  if (dt.cliente_nome && venda.cliente_nome) {
    return String(dt.cliente_nome).trim().toLowerCase() === String(venda.cliente_nome).trim().toLowerCase();
  }
  return true;
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
    vendas.filter((v) => v.numero).map((v) => [normCodigo(v.numero), v])
  );
  const valesById = new Map(vales.map((v) => [v.id, v]));
  const valesByCodigo = new Map(
    vales.filter((v) => v.codigo).map((v) => [normCodigo(v.codigo), v])
  );

  const pares = [];
  const parKeys = new Set();
  const idsSubstituidos = new Set();
  const idsSubstitutos = new Set();

  const resolveOrigem = (origemId, origemNumero) => {
    let origem = origemId ? vendasById.get(origemId) : null;
    if (!origem && origemNumero) origem = vendasByNumero.get(normCodigo(origemNumero));
    return origem;
  };

  const resolveSubstituto = (subId, subNumero) => {
    let sub = subId ? vendasById.get(subId) : null;
    if (!sub && subNumero) sub = vendasByNumero.get(normCodigo(subNumero));
    return sub;
  };

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
    const origem = resolveOrigem(substituto.substitui_pedido_id, substituto.substitui_pedido_numero);
    if (origem && mesmoDiaCivil(origem.created_date, substituto.created_date)) {
      addPar(origem, substituto, { fonte: 'pedido' });
    }
  }

  // 2) Vale troca no pagamento (id ou código)
  for (const substituto of vendas) {
    if (idsSubstitutos.has(substituto.id)) continue;
    const pag = pagamentoVale(substituto);
    const vale = resolveVale(pag, valesById, valesByCodigo);
    if (!vale?.pedido_origem_id && !vale?.pedido_origem_numero) continue;
    const origem = resolveOrigem(vale.pedido_origem_id, vale.pedido_origem_numero);
    if (!origem) continue;
    if (!mesmoDiaCivil(origem.created_date, substituto.created_date)) continue;
    addPar(origem, substituto, { fonte: 'vale_pagamento', valeCodigo: vale.codigo });
  }

  // 2b) Histórico de uso do vale → pedido substituto no turno
  for (const vale of vales) {
    const origem = resolveOrigem(vale.pedido_origem_id, vale.pedido_origem_numero);
    if (!origem || idsSubstituidos.has(origem.id)) continue;
    for (const uso of getHistoricoUso(vale)) {
      const substituto = resolveSubstituto(uso.pedido_id, uso.pedido_numero);
      if (!substituto || substituto.id === origem.id) continue;
      if (!mesmoDiaCivil(origem.created_date, substituto.created_date)) continue;
      addPar(origem, substituto, { fonte: 'vale_historico', valeCodigo: vale.codigo });
    }
  }

  // 3) Devolução com substituto já gravado
  for (const dt of devolucoes) {
    if (!dt.pedido_substituto_id && !dt.pedido_substituto_numero) continue;
    const substituto = resolveSubstituto(dt.pedido_substituto_id, dt.pedido_substituto_numero);
    const origem = resolveOrigem(dt.pedido_origem_id, dt.pedido_origem_numero);
    if (!origem || !substituto) continue;
    if (!mesmoDiaCivil(origem.created_date, substituto.created_date)) continue;
    addPar(origem, substituto, { fonte: 'devolucao_gravada', devolucaoNumero: dt.numero });
  }

  // 4) Devolução + vale: histórico ou pagamento com mesmo código/id do vale da devolução
  for (const dt of devolucoes) {
    const origem = resolveOrigem(dt.pedido_origem_id, dt.pedido_origem_numero);
    if (!origem || idsSubstituidos.has(origem.id)) continue;
    const vale = resolveValeDevolucao(dt, valesById, valesByCodigo);
    if (vale) {
      for (const uso of getHistoricoUso(vale)) {
        const substituto = resolveSubstituto(uso.pedido_id, uso.pedido_numero);
        if (!substituto || substituto.id === origem.id) continue;
        if (!mesmoDiaCivil(origem.created_date, substituto.created_date)) continue;
        addPar(origem, substituto, { fonte: 'devolucao_vale_historico', devolucaoNumero: dt.numero });
      }
      const codigoVale = normCodigo(vale.codigo);
      for (const substituto of vendas) {
        if (idsSubstitutos.has(substituto.id) || substituto.id === origem.id) continue;
        const pag = pagamentoVale(substituto);
        const valePag = resolveVale(pag, valesById, valesByCodigo);
        if (!valePag) continue;
        if (valePag.id === vale.id || normCodigo(valePag.codigo) === codigoVale) {
          if (!mesmoDiaCivil(origem.created_date, substituto.created_date)) continue;
          addPar(origem, substituto, { fonte: 'devolucao_vale_codigo', devolucaoNumero: dt.numero });
        }
      }
    }
  }

  // 5) Devolução no dia → venda posterior do mesmo cliente (troca típica sem flag aguarda_substituto)
  for (const dt of devolucoes) {
    const origem = resolveOrigem(dt.pedido_origem_id, dt.pedido_origem_numero);
    if (!origem || idsSubstituidos.has(origem.id)) continue;

    const origemTime = new Date(origem.created_date || 0).getTime();
    const dtTime = new Date(dt.created_date || 0).getTime();
    const minTime = Math.max(origemTime, dtTime);

    const candidatos = vendas.filter((v) => {
      if (v.id === origem.id || idsSubstitutos.has(v.id)) return false;
      if (!mesmoDiaCivil(v.created_date, origem.created_date)) return false;
      if (new Date(v.created_date || 0).getTime() < minTime) return false;
      if (!mesmoClienteContexto(dt, v)) return false;
      return true;
    });

    const comValeDaDevolucao = candidatos.filter((sub) => {
      const pag = pagamentoVale(sub);
      if (!pag) return false;
      const valePag = resolveVale(pag, valesById, valesByCodigo);
      if (!valePag) return false;
      const valeDt = resolveValeDevolucao(dt, valesById, valesByCodigo);
      if (!valeDt) return false;
      return valePag.id === valeDt.id || normCodigo(valePag.codigo) === normCodigo(valeDt.codigo);
    });

    if (comValeDaDevolucao.length === 1) {
      addPar(origem, comValeDaDevolucao[0], { fonte: 'devolucao_candidato_vale', devolucaoNumero: dt.numero });
    } else if (dt.aguarda_substituto && candidatos.length === 1) {
      addPar(origem, candidatos[0], { fonte: 'aguarda_substituto', devolucaoNumero: dt.numero });
    } else if (candidatos.length === 1) {
      addPar(origem, candidatos[0], { fonte: 'devolucao_candidato_unico', devolucaoNumero: dt.numero });
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

/** Status que contam como venda concluída para totais operacionais. */
export const STATUS_VENDA_CONCLUIDA = [
  'Financeiro OK',
  'Finalizado',
  'Pedido Concluído',
  'Em Separação',
  'Em Rota de Entrega',
];

/**
 * Carrega a fonte única (pedidos + vales + devoluções) para índice de substituições.
 */
export async function carregarFonteSubstituicoesVendas(api) {
  const [pedidos, vales, devolucoes] = await Promise.all([
    api.entities.PedidoVenda.list(),
    api.entities.ValeCompra.list(),
    api.entities.DevolucaoTroca.list(),
  ]);
  return { pedidos, vales, devolucoes };
}

/** Índice global de pares — mesma regra em caixa, home, gestão e dashboard. */
export function criarIndiceSubstituicoes({ pedidos = [], vendas, vales = [], devolucoes = [] } = {}) {
  const lista = pedidos.length > 0 ? pedidos : vendas || [];
  return buildSubstituicoesVendaCaixa({ vendas: lista, vales, devolucoes });
}

export function getMetaSubstituicao(ctx, pedidoId) {
  return ctx?.metaPorPedidoId?.[pedidoId] || { papel: 'normal' };
}

/** Totais úteis só sobre o subconjunto de pedidos passado (ex.: filtro do dia). */
export function calcularTotaisUtilPedidos(pedidos, ctx) {
  if (!ctx) {
    const valor = round2(pedidos.reduce((s, p) => s + valorPedido(p), 0));
    return { quantidade: pedidos.length, valorUtil: valor, valorBruto: valor, qtdSubstituicoes: 0 };
  }
  if (ctx.idsCancelados && ctx.metaPorPedidoId) {
    const idsNoConjunto = new Set(pedidos.map((p) => p.id));
    let valorUtil = 0;
    let quantidade = 0;
    for (const p of pedidos) {
      const meta = ctx.metaPorPedidoId[p.id];
      if (meta?.contaNoTotal === false || ctx.idsSubstituidos.has(p.id)) continue;
      quantidade += 1;
      valorUtil += valorPedido(p);
    }
    const valorBruto = round2(pedidos.reduce((s, p) => s + valorPedido(p), 0));
    const paresNoConjunto = (ctx.pares || []).filter(
      (par) => idsNoConjunto.has(par.origem.id) && idsNoConjunto.has(par.substituto.id)
    ).length;
    return {
      quantidade,
      valorUtil: round2(valorUtil),
      valorBruto,
      qtdSubstituicoes: paresNoConjunto,
      valorSubstituidoNaoSoma: round2(valorBruto - valorUtil),
    };
  }
  const idsNoConjunto = new Set(pedidos.map((p) => p.id));
  let valorUtil = 0;
  let quantidade = 0;
  for (const p of pedidos) {
    if (ctx.idsSubstituidos.has(p.id)) continue;
    quantidade += 1;
    valorUtil += valorPedido(p);
  }
  const valorBruto = round2(pedidos.reduce((s, p) => s + valorPedido(p), 0));
  const paresNoConjunto = (ctx.pares || []).filter(
    (par) => idsNoConjunto.has(par.origem.id) && idsNoConjunto.has(par.substituto.id)
  ).length;
  return {
    quantidade,
    valorUtil: round2(valorUtil),
    valorBruto,
    qtdSubstituicoes: paresNoConjunto,
    valorSubstituidoNaoSoma: round2(valorBruto - valorUtil),
  };
}

/**
 * Lista para UI: esconde substituídas; se filtro trouxer só a substituída, mostra o substituto.
 */
export function mapPedidosParaListaGestao(pedidos, ctx) {
  if (!ctx) return pedidos.map((p) => ({ ...p, substituicao: { papel: 'normal' } }));
  const seen = new Set();
  const lista = [];
  for (const p of pedidos) {
    if (ctx.idsSubstituidos.has(p.id)) {
      const substituto = ctx.metaPorPedidoId[p.id]?.par?.substituto;
      if (substituto && !seen.has(substituto.id)) {
        seen.add(substituto.id);
        lista.push({
          ...substituto,
          substituicao: getMetaSubstituicao(ctx, substituto.id),
        });
      }
      continue;
    }
    if (!seen.has(p.id)) {
      seen.add(p.id);
      lista.push({
        ...p,
        substituicao: getMetaSubstituicao(ctx, p.id),
      });
    }
  }
  return lista;
}

/** Pedidos do turno/dia com metadados — alias para caixa. */
export function aplicarSubstituicoesEmVendas(vendas, ctx) {
  if (!ctx) return { vendasExibicao: vendas, totalVendasUtil: vendas.reduce((s, v) => s + valorPedido(v), 0), ctx: null };
  return {
    vendasExibicao: ctx.vendasParaExibicao,
    totalVendasUtil: ctx.totalVendasUtil,
    ctx,
  };
}
