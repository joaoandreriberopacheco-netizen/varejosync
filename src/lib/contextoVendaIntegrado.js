/**
 * Fonte única de leitura: substituições + cancelamentos + eventos (pagamento, detalhes).
 * Usar em gestão, home, dashboard, caixa, comprovante e detalhes.
 */

import {
  buildSubstituicoesVendaCaixa,
  carregarFonteSubstituicoesVendas,
  calcularTotaisUtilPedidos as calcTotaisSubst,
  mapPedidosParaListaGestao as mapListaSubst,
  getMetaSubstituicao,
  formatarDiferencaSubstituicao,
  STATUS_VENDA_CONCLUIDA,
  dataCivilISO,
  mesmoDiaCivil,
} from '@/lib/substituicoesVendaCaixa';
import { lerEventosVenda, TIPO_EVENTO, rotuloEvento } from '@/lib/eventosVenda';

export {
  carregarFonteSubstituicoesVendas,
  formatarDiferencaSubstituicao,
  STATUS_VENDA_CONCLUIDA,
  dataCivilISO,
  mesmoDiaCivil,
  getMetaSubstituicao,
};

/** @deprecated Use criarIndiceContextoVenda */
export function criarIndiceSubstituicoes(params) {
  return criarIndiceContextoVenda(params);
}

function normNumero(n) {
  return String(n || '').trim().toUpperCase();
}

function valorPedido(v) {
  return Number(v?.valor_total ?? v?.total ?? 0) || 0;
}

function pedidoEstaCancelado(p, idsCancelados) {
  if (idsCancelados.has(p.id)) return true;
  return (p.status || '').toLowerCase() === 'cancelado';
}

function indexarCancelamentosTurnos(turnos = [], vendasById, vendasByNumero) {
  const idsCancelados = new Set();
  const metaCancelamento = {};

  for (const turno of turnos) {
    for (const c of turno.cancelamentos_rastro || []) {
      let pedido = c.pedido_id ? vendasById.get(c.pedido_id) : null;
      if (!pedido && c.pedido_numero) {
        pedido = vendasByNumero.get(normNumero(c.pedido_numero));
      }
      if (pedido?.id) {
        idsCancelados.add(pedido.id);
        metaCancelamento[pedido.id] = {
          motivo: c.motivo_cancelamento,
          cancelado_por: c.cancelado_por,
          data_cancelamento: c.data_cancelamento,
          turno_id: turno.id,
        };
      }
    }
  }
  return { idsCancelados, metaCancelamento };
}

function enriquecerMeta(pedido, subCtx, idsCancelados, metaCancelamento) {
  const sub = getMetaSubstituicao(subCtx, pedido.id);
  const eventos = lerEventosVenda(pedido);
  const cancelado = pedidoEstaCancelado(pedido, idsCancelados);
  const substituida = subCtx.idsSubstituidos.has(pedido.id);

  let papel = sub.papel || 'normal';
  if (cancelado) papel = 'cancelada';
  else if (substituida) papel = 'substituida';

  const contaNoTotal = !cancelado && !substituida;

  const destaques = [];
  if (sub.papel === 'substituto' && sub.origem) {
    destaques.push({
      tipo: TIPO_EVENTO.SUBSTITUICAO,
      rotulo: `Substitui ${sub.origem.numero}`,
      origem: sub.origem,
      diferenca: sub.diferenca,
    });
  }
  if (cancelado) {
    destaques.push({
      tipo: TIPO_EVENTO.CANCELAMENTO,
      rotulo: 'Cancelada',
      ...metaCancelamento[pedido.id],
    });
  }
  const ultimoPagamento = [...eventos].reverse().find((e) => e.tipo === TIPO_EVENTO.PAGAMENTO_ALTERADO);
  if (ultimoPagamento) {
    destaques.push({ tipo: TIPO_EVENTO.PAGAMENTO_ALTERADO, rotulo: 'Pagamento alterado', evento: ultimoPagamento });
  }
  const ultimoDetalhe = [...eventos].reverse().find((e) => e.tipo === TIPO_EVENTO.DETALHE_ALTERADO);
  if (ultimoDetalhe && !cancelado) {
    destaques.push({ tipo: TIPO_EVENTO.DETALHE_ALTERADO, rotulo: rotuloEvento(ultimoDetalhe), evento: ultimoDetalhe });
  }

  return {
    ...sub,
    papel,
    eventos,
    destaques,
    contaNoTotal,
    cancelado,
    substituicao: sub,
    contexto: {
      papel,
      eventos,
      destaques,
      contaNoTotal,
      cancelado,
      substituicao: sub,
    },
  };
}

/**
 * Índice completo para totais e UI integrada.
 * @param {object} params
 * @param {object[]} [params.pedidos]
 * @param {object[]} [params.vendas]
 * @param {object[]} [params.vales]
 * @param {object[]} [params.devolucoes]
 * @param {object[]} [params.turnos] - cancelamentos_rastro
 */
export function criarIndiceContextoVenda({
  pedidos = [],
  vendas,
  vales = [],
  devolucoes = [],
  turnos = [],
} = {}) {
  const lista = pedidos.length > 0 ? pedidos : vendas || [];
  const subCtx = buildSubstituicoesVendaCaixa({ vendas: lista, vales, devolucoes });

  const vendasById = new Map(lista.map((v) => [v.id, v]));
  const vendasByNumero = new Map(
    lista.filter((v) => v.numero).map((v) => [normNumero(v.numero), v])
  );

  const idsCancelados = new Set();
  for (const p of lista) {
    if ((p.status || '').toLowerCase() === 'cancelado') idsCancelados.add(p.id);
  }

  const { idsCancelados: idsTurno, metaCancelamento } = indexarCancelamentosTurnos(
    turnos,
    vendasById,
    vendasByNumero
  );
  idsTurno.forEach((id) => idsCancelados.add(id));

  const metaPorPedidoId = { ...subCtx.metaPorPedidoId };
  for (const p of lista) {
    metaPorPedidoId[p.id] = enriquecerMeta(p, subCtx, idsCancelados, metaCancelamento);
  }

  const vendasParaExibicao = lista.filter(
    (v) => !subCtx.idsSubstituidos.has(v.id)
  );

  const totalVendasBruto = lista.reduce((s, v) => s + valorPedido(v), 0);
  let totalVendasUtil = 0;
  for (const v of lista) {
    const meta = metaPorPedidoId[v.id];
    if (meta?.contaNoTotal) totalVendasUtil += valorPedido(v);
  }
  totalVendasUtil = Math.round(totalVendasUtil * 100) / 100;
  const totalVendasBrutoR = Math.round(totalVendasBruto * 100) / 100;

  return {
    ...subCtx,
    idsCancelados,
    metaCancelamento,
    metaPorPedidoId,
    vendasParaExibicao,
    totalVendasBruto: totalVendasBrutoR,
    totalVendasUtil,
    valorSubstituidoNaoSoma: Math.round((totalVendasBrutoR - totalVendasUtil) * 100) / 100,
    qtdCancelamentos: idsCancelados.size,
  };
}

export function getContextoPedido(ctx, pedidoId) {
  return ctx?.metaPorPedidoId?.[pedidoId]?.contexto || {
    papel: 'normal',
    eventos: [],
    destaques: [],
    contaNoTotal: true,
    cancelado: false,
    substituicao: getMetaSubstituicao(ctx, pedidoId),
  };
}

/** Totais úteis: exclui substituídas e canceladas. */
export function calcularTotaisUtilPedidos(pedidos, ctx) {
  if (!ctx) return calcTotaisSubst(pedidos, null);

  const idsNoConjunto = new Set(pedidos.map((p) => p.id));
  let valorUtil = 0;
  let quantidade = 0;
  let qtdCancelados = 0;

  for (const p of pedidos) {
    const meta = ctx.metaPorPedidoId?.[p.id];
    if (meta?.cancelado || ctx.idsSubstituidos?.has(p.id)) {
      if (meta?.cancelado) qtdCancelados += 1;
      continue;
    }
    quantidade += 1;
    valorUtil += valorPedido(p);
  }

  const valorBruto = Math.round(pedidos.reduce((s, p) => s + valorPedido(p), 0) * 100) / 100;
  const paresNoConjunto = (ctx.pares || []).filter(
    (par) => idsNoConjunto.has(par.origem.id) && idsNoConjunto.has(par.substituto.id)
  ).length;

  return {
    quantidade,
    valorUtil: Math.round(valorUtil * 100) / 100,
    valorBruto,
    qtdSubstituicoes: paresNoConjunto,
    qtdCancelados,
    valorSubstituidoNaoSoma: Math.round((valorBruto - valorUtil) * 100) / 100,
  };
}

export function mapPedidosParaListaGestao(pedidos, ctx) {
  const base = mapListaSubst(pedidos, ctx);
  return base.map((p) => {
    const meta = ctx?.metaPorPedidoId?.[p.id];
    return {
      ...p,
      contexto: meta?.contexto || p.substituicao,
      substituicao: meta?.substituicao || p.substituicao,
    };
  });
}

export function aplicarSubstituicoesEmVendas(vendas, ctx) {
  if (!ctx) {
    const total = vendas.reduce((s, v) => s + valorPedido(v), 0);
    return { vendasExibicao: vendas, totalVendasUtil: total, ctx: null };
  }
  return {
    vendasExibicao: ctx.vendasParaExibicao,
    totalVendasUtil: ctx.totalVendasUtil,
    ctx,
  };
}

/** Carrega fonte + turnos abertos/recentes para cancelamentos no índice. */
export async function carregarFonteContextoVendas(api) {
  const [fonte, turnos] = await Promise.all([
    carregarFonteSubstituicoesVendas(api),
    api.entities.TurnoCaixa.list().catch(() => []),
  ]);
  return { ...fonte, turnos };
}

export function criarIndiceFromFonte(fonte) {
  return criarIndiceContextoVenda(fonte);
}
