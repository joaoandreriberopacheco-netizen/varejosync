/**
 * Envio do pedido de compra para aprovação financeira (unitário ou lote).
 * Espelha o bloco financeiro do PedidoCompraForm após salvar o pedido.
 */

import { format, addDays } from 'date-fns';
import { registrarTransicao } from '@/components/compras/transicaoHelper';
import { dataHoje, formatarLogTime } from '@/components/utils/dateUtils';
import {
  calcValorItensPedidoCompra,
  calcValorTotalPedidoCompra,
  cancelarLancamentosNaoPagosPedidoCompra,
  listarLancamentosPedidoCompra,
  temLancamentoPagoParaPedido,
} from '@/lib/pedidoCompraFinanceiro';

const STATUS_ENVIO = 'Aguardando Aprovação Financeira';

function nomeResponsavel(user = {}, authData = {}) {
  return authData.intervenienteName || authData.userName || user?.full_name || 'Usuário';
}

async function carregarPedidoAtual(base44, pedidoId) {
  const rows = await base44.entities.PedidoCompra.filter({ id: pedidoId });
  return rows?.[0] || null;
}

/**
 * @param {object} params
 * @param {import('@/api/base44Client').base44} params.base44
 * @param {object} params.pedido — pedido com id (demais campos reforçados via fetch)
 * @param {object} [params.user]
 * @param {string} [params.formaPagamento]
 * @param {string} [params.dataPrimeiroVencimento]
 * @param {number} [params.numParcelas]
 * @param {number} [params.intervaloParcelasDias]
 * @param {object} [params.authData]
 * @param {string} [params.observacaoLote]
 */
export async function enviarPedidoCompraParaAprovacaoFinanceira({
  base44,
  pedido,
  user,
  formaPagamento = 'Parcelado',
  dataPrimeiroVencimento = '',
  numParcelas = 1,
  intervaloParcelasDias = 30,
  authData = {},
  observacaoLote = '',
}) {
  if (!pedido?.id) {
    throw new Error('Pedido inválido.');
  }

  const currentPO = (await carregarPedidoAtual(base44, pedido.id)) || pedido;
  const numero = currentPO.numero || pedido.numero || pedido.id;

  if (currentPO.status !== 'Rascunho') {
    throw new Error(`Pedido ${numero} não está em Rascunho (status: ${currentPO.status}).`);
  }

  const saf = String(currentPO.status_aprovacao_financeira || '');
  if (
    saf === STATUS_ENVIO ||
    saf === 'Aprovado Financeiramente' ||
    saf === 'Aprovado' ||
    saf === 'Solicitação de Edição Pendente'
  ) {
    throw new Error(`Pedido ${numero} já está no financeiro (status: ${saf}).`);
  }

  if (!currentPO.fornecedor_id) {
    throw new Error(`Pedido ${numero} sem fornecedor.`);
  }

  const itens = Array.isArray(currentPO.itens) ? currentPO.itens : [];
  if (!itens.length) {
    throw new Error(`Pedido ${numero} sem itens.`);
  }

  const lancsExistentes = await listarLancamentosPedidoCompra(base44, currentPO.id);
  if (temLancamentoPagoParaPedido(lancsExistentes)) {
    throw new Error(`Pedido ${numero} tem parcelas já pagas. Alinhe com o financeiro antes de reenviar.`);
  }

  const valorItens = calcValorItensPedidoCompra(currentPO);
  const valorTotal = calcValorTotalPedidoCompra(currentPO);
  const statusAnterior = currentPO.status || 'Rascunho';
  const responsavel = nomeResponsavel(user, authData);
  const refAuth = authData.operationCode ? ` | Ref: ${authData.operationCode}` : '';
  const notaHistorico = `\n[Enviado ao financeiro: ${responsavel}${refAuth} | ${formatarLogTime()}]${observacaoLote ? ` ${observacaoLote}` : ''}`;

  const forma = formaPagamento || currentPO.forma_pagamento_compra || 'Parcelado';
  const dataVenc = dataPrimeiroVencimento || currentPO.data_primeiro_vencimento || dataHoje();
  const parcelas = Math.max(1, Number(numParcelas) || Number(currentPO.num_parcelas) || 1);
  const intervaloDias = Math.max(1, Number(intervaloParcelasDias) || Number(currentPO.intervalo_parcelas_dias) || 30);

  await cancelarLancamentosNaoPagosPedidoCompra(
    base44,
    currentPO.id,
    observacaoLote ? `| ${observacaoLote.trim()} |` : '| Envio ao financeiro |',
  );

  const baseLancamento = {
    tipo: 'Despesa',
    terceiro_id: currentPO.fornecedor_id,
    terceiro_nome: currentPO.fornecedor_nome,
    status: 'Em Aberto',
    categoria: 'Compra de Mercadoria',
    referencia_id: currentPO.id,
    referencia_tipo: 'PedidoCompra',
    referencia_numero: currentPO.numero,
    is_custo_mercadoria: true,
    pedido_compra_vinculado_id: currentPO.id,
    pedido_compra_vinculado_numero: currentPO.numero,
  };

  if (forma === 'À Vista') {
    await base44.entities.LancamentoFinanceiro.create({
      ...baseLancamento,
      descricao: `Compra de Mercadoria - ${currentPO.numero} (À Vista)`,
      forma_pagamento_tipo: 'À Vista',
      forma_pagamento_compra: 'À Vista',
      valor: valorTotal,
      data_vencimento: dataVenc,
      observacoes: 'Pagamento à vista. Aguardando aprovação do financeiro.',
    });
  } else {
    const valorParcela = valorTotal / parcelas;
    const dataBase = dataVenc ? new Date(`${dataVenc}T12:00:00`) : addDays(new Date(), 30);

    for (let i = 0; i < parcelas; i += 1) {
      const dataVencimento = format(addDays(dataBase, i * intervaloDias), 'yyyy-MM-dd');
      await base44.entities.LancamentoFinanceiro.create({
        ...baseLancamento,
        descricao: `Compra de Mercadoria - ${currentPO.numero} (${i + 1}/${parcelas})`,
        forma_pagamento_tipo: 'Parcelado',
        forma_pagamento_compra: 'Parcelado',
        valor: valorParcela,
        data_vencimento: dataVencimento,
        observacoes: `Parcela ${i + 1} de ${parcelas}. Aguardando aprovação do financeiro.`,
      });
    }
  }

  const historicoAtualizado = (currentPO.historico || '') + notaHistorico;

  await base44.entities.PedidoCompra.update(currentPO.id, {
    status: STATUS_ENVIO,
    status_aprovacao_financeira: STATUS_ENVIO,
    forma_pagamento_compra: forma,
    data_primeiro_vencimento: dataVenc,
    num_parcelas: forma === 'Parcelado' ? parcelas : 1,
    intervalo_parcelas_dias: intervaloDias,
    valor_itens: valorItens,
    valor_total: valorTotal,
    historico: historicoAtualizado,
  });

  await registrarTransicao({
    pedidoId: currentPO.id,
    pedidoNumero: currentPO.numero,
    statusAnterior,
    statusNovo: STATUS_ENVIO,
    responsavel: {
      id: authData.intervenienteId || user?.id,
      nome: responsavel,
      email: user?.email || authData.intervenienteEmail || '',
    },
    tipoAutenticacao: authData.intervenienteId ? 'Interveniente' : 'Usuario',
    codigoOperacao: authData.operationCode || '',
    observacao: observacaoLote || 'Envio para aprovação financeira',
    historicoAtual: historicoAtualizado,
  });

  await base44.entities.Tarefa.create({
    titulo: `Recebimento de Mercadoria - ${currentPO.numero}`,
    tipo: 'Recebimento de Mercadoria',
    status: 'Pendente',
    prioridade: 'Alta',
    responsavel_id: user?.id,
    responsavel_nome: user?.full_name || responsavel,
    referencia_tipo: 'PedidoCompra',
    referencia_id: currentPO.id,
    referencia_numero: currentPO.numero,
    valor_pendente: valorTotal,
    descricao: `Aguardando recebimento da mercadoria do fornecedor ${currentPO.fornecedor_nome}. Informe despacho e chegada na aba Logística do pedido.`,
    data_vencimento: format(
      new Date(currentPO.data_prevista_entrega || dataVenc),
      'yyyy-MM-dd',
    ),
  });

  return { pedidoId: currentPO.id, numero: currentPO.numero, valorTotal };
}

/** Envia vários pedidos (ids únicos) com a mesma forma de pagamento / vencimento. */
export async function enviarPedidoCompraFinanceiroLote({
  base44,
  pedidoIds = [],
  pedidosPorId = {},
  user,
  formaPagamento,
  dataPrimeiroVencimento,
  numParcelas = 1,
  intervaloParcelasDias = 30,
  authData = {},
}) {
  const idsUnicos = [...new Set(pedidoIds.filter(Boolean))];
  const enviados = [];
  const erros = [];

  for (const id of idsUnicos) {
    try {
      const resultado = await enviarPedidoCompraParaAprovacaoFinanceira({
        base44,
        pedido: pedidosPorId[id] || { id },
        user,
        formaPagamento,
        dataPrimeiroVencimento,
        numParcelas,
        intervaloParcelasDias,
        authData,
        observacaoLote: 'Envio em lote',
      });
      enviados.push(resultado);
    } catch (error) {
      erros.push({
        id,
        numero: pedidosPorId[id]?.numero || id,
        mensagem: error?.message || String(error),
      });
    }
  }

  if (!enviados.length && erros.length) {
    const msg = erros.map((e) => `${e.numero}: ${e.mensagem}`).join(' · ');
    throw new Error(msg);
  }

  return { enviados, erros };
}
