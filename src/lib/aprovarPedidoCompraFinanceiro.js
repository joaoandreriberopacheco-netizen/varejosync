/**
 * Ações financeiras centralizadas do Pedido de Compra (aprovar, rejeitar, liberar edição).
 * Usado em AprovacoesFinanceiras e no painel da aba Financeiro do pedido.
 */

import { format } from 'date-fns';
import { registrarTransicao } from '@/components/compras/transicaoHelper';
import {
  calcValorTotalPedidoCompra,
  cancelarLancamentosNaoPagosPedidoCompra,
  listarLancamentosPedidoCompra,
} from '@/lib/pedidoCompraFinanceiro';

export function pedidoAguardandoAprovacaoFinanceira(pedido = {}) {
  const status = pedido.status || '';
  const saf = pedido.status_aprovacao_financeira || '';
  return (
    status === 'Aguardando Aprovação Financeira' ||
    status === 'Aguardando Liberação' ||
    saf === 'Aguardando Aprovação Financeira'
  );
}

export function pedidoAprovadoFinanceiramente(pedido = {}) {
  const saf = pedido.status_aprovacao_financeira || '';
  if (saf === 'Aprovado Financeiramente' || saf === 'Aprovado') return true;
  return [
    'Aprovado',
    'Aguardando Recepção',
    'Aguardando Embarque',
    'Enviado',
    'Despachado',
    'Em Recepção',
    'Em Trânsito',
    'Recebido Parcialmente',
    'Recebido Parcial',
    'Pendência',
    'Concluído',
  ].includes(pedido.status || '');
}

/** Financeiro liberou compra/logística, mas embarque ainda sem despacho (card = Aprovado). */
export function pedidoLiberadoParaLogistica(pedido = {}) {
  if (pedidoAguardandoAprovacaoFinanceira(pedido)) return false;
  return pedidoAprovadoFinanceiramente(pedido);
}

function nomeAprovador(authData = {}) {
  return authData.intervenienteName || authData.userName || 'Usuário';
}

/**
 * Aprova o pedido: libera logística (Aguardando Recepção), CMV nos lançamentos, transição auditada.
 */
export async function aprovarPedidoCompraFinanceiro({
  base44,
  pedido,
  contaId,
  contaNome = '',
  authData = {},
}) {
  if (!pedido?.id || !contaId) {
    throw new Error('Pedido ou conta de pagamento não informados.');
  }

  const agora = new Date().toISOString();
  const aprovador = nomeAprovador(authData);
  const notaAprovacao = `\n[Aprovado: ${aprovador} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`;
  const statusAnterior = pedido.status || 'Aguardando Liberação';
  const historicoAtualizado = (pedido.historico || '') + notaAprovacao;

  await base44.entities.PedidoCompra.update(pedido.id, {
    status: 'Aguardando Recepção',
    status_aprovacao_financeira: 'Aprovado Financeiramente',
    conta_pagamento_id: contaId,
    conta_pagamento_nome: contaNome,
    data_aprovacao_financeira: agora,
    historico: historicoAtualizado,
  });

  await registrarTransicao({
    pedidoId: pedido.id,
    pedidoNumero: pedido.numero,
    statusAnterior,
    statusNovo: 'Aguardando Recepção',
    responsavel: {
      id: authData.intervenienteId || authData.userId,
      nome: aprovador,
      email: authData.intervenienteEmail || '',
    },
    tipoAutenticacao: 'Interveniente',
    codigoOperacao: authData.codigoOperacao || authData.operationCode || '',
    observacao: `Aprovação financeira. Conta: ${contaNome || contaId}`,
    historicoAtual: historicoAtualizado,
  });

  const lancamentos = await base44.entities.LancamentoFinanceiro.filter({ referencia_id: pedido.id });
  const valor = calcValorTotalPedidoCompra(pedido);

  if (lancamentos.length === 0) {
    await base44.entities.LancamentoFinanceiro.create({
      tipo: 'Despesa',
      descricao: `Compra - ${pedido.fornecedor_nome || pedido.numero}`,
      terceiro_id: pedido.fornecedor_id,
      terceiro_nome: pedido.fornecedor_nome,
      valor,
      valor_liquido: valor,
      data_vencimento: pedido.data_prevista_entrega || format(new Date(), 'yyyy-MM-dd'),
      status: 'Em Aberto',
      status_conciliacao: 'N/A',
      conta_financeira_id: contaId,
      conta_financeira_nome: contaNome,
      referencia_id: pedido.id,
      referencia_tipo: 'PedidoCompra',
      referencia_numero: pedido.numero,
      observacoes: notaAprovacao.trim(),
      is_custo_mercadoria: true,
      pedido_compra_vinculado_id: pedido.id,
      pedido_compra_vinculado_numero: pedido.numero,
      forma_pagamento_tipo: pedido.forma_pagamento_compra || undefined,
      forma_pagamento_compra: pedido.forma_pagamento_compra || undefined,
    });
  } else {
    for (const l of lancamentos) {
      await base44.entities.LancamentoFinanceiro.update(l.id, {
        tipo: 'Despesa',
        status: 'Em Aberto',
        conta_financeira_id: contaId,
        conta_financeira_nome: contaNome,
        is_custo_mercadoria: true,
        pedido_compra_vinculado_id: pedido.id,
        pedido_compra_vinculado_numero: pedido.numero,
        observacoes: (l.observacoes || '') + notaAprovacao,
        forma_pagamento_tipo: l.forma_pagamento_tipo || pedido.forma_pagamento_compra || undefined,
        forma_pagamento_compra: l.forma_pagamento_compra || pedido.forma_pagamento_compra || undefined,
      });
    }
  }

  return { statusNovo: 'Aguardando Recepção' };
}

export async function rejeitarPedidoCompraFinanceiro({ base44, pedido, motivo, authData = {} }) {
  if (!pedido?.id || !motivo?.trim()) {
    throw new Error('Informe o motivo da rejeição.');
  }

  const motivoLimpo = motivo.trim();
  const nota = `\n[Rejeitado Financeiramente: ${motivoLimpo} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`;

  await base44.entities.PedidoCompra.update(pedido.id, {
    status: 'Cancelado',
    status_aprovacao_financeira: 'Rejeitado Financeiramente',
    motivo_rejeicao_financeira: motivoLimpo,
    data_rejeicao_financeira: new Date().toISOString(),
    historico: (pedido.historico || '') + nota,
  });

  const lancamentos = await listarLancamentosPedidoCompra(base44, pedido.id);
  await Promise.all(
    lancamentos
      .filter((l) => l.status === 'Em Aberto' || l.status === 'Vencido')
      .map((l) =>
        base44.entities.LancamentoFinanceiro.update(l.id, {
          status: 'Cancelado',
          observacoes: `${l.observacoes || ''}${nota}`.trim(),
        })
      )
  );

  return { statusNovo: 'Cancelado' };
}

export async function liberarEdicaoPedidoCompraFinanceiro({ base44, pedido, authData = {} }) {
  if (!pedido?.id) throw new Error('Pedido não encontrado.');

  const nota = `| Liberar edição | Ref: ${authData.operationCode || authData.codigoOperacao || ''} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
  await cancelarLancamentosNaoPagosPedidoCompra(base44, pedido.id, nota);

  await base44.entities.PedidoCompra.update(pedido.id, {
    status: 'Rascunho',
    status_aprovacao_financeira: 'Pendente',
    historico:
      (pedido.historico || '') +
      `\n[Liberado para Edição: ${nomeAprovador(authData)} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`,
  });

  return { statusNovo: 'Rascunho' };
}
