/**
 * Helper para registrar transições de status de PedidoCompra na entidade TransicaoPedidoCompra.
 * Centraliza a lógica de log de intervenções para todos os componentes do módulo de compras.
 */
import { base44 } from '@/api/base44Client';
import { agora } from '@/components/utils/dateUtils';

/**
 * Registra uma transição de status no log da entidade TransicaoPedidoCompra.
 * Usa sempre o fuso do negócio (Tabatinga, AM — IANA `America/Rio_Branco`) via `agora()` em dateUtils.
 *
 * @param {Object} params
 * @param {string} params.pedidoId - ID do PedidoCompra
 * @param {string} params.pedidoNumero - Número do pedido (cache)
 * @param {string} params.statusAnterior - Status antes da transição
 * @param {string} params.statusNovo - Status após a transição
 * @param {Object} params.responsavel - { id, nome/full_name, email }
 * @param {string} [params.codigoOperacao] - Código da operação de autenticação
 * @param {string} [params.observacao] - Motivo ou observação
 * @param {'Usuario'|'Interveniente'|'Sistema'} [params.tipoAutenticacao]
 */
export async function registrarTransicao({
  pedidoId,
  pedidoNumero,
  statusAnterior,
  statusNovo,
  responsavel,
  codigoOperacao = '',
  observacao = '',
  tipoAutenticacao = 'Usuario',
}) {
  await base44.entities.TransicaoPedidoCompra.create({
    pedido_id: pedidoId,
    pedido_numero: pedidoNumero || '',
    status_anterior: statusAnterior || '',
    status_novo: statusNovo,
    responsavel_id: responsavel?.id || '',
    responsavel_nome: responsavel?.nome || responsavel?.full_name || '',
    responsavel_email: responsavel?.email || '',
    tipo_autenticacao: tipoAutenticacao,
    codigo_operacao: codigoOperacao,
    observacao: observacao,
    data_transicao: agora(), // ← sempre fuso sistema
  });
}