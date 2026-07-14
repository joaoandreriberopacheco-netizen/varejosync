/**
 * Helper para registrar transições de status de PedidoCompra.
 * Casa nova (Supabase): grava na tabela `transicao_pedido_compra`.
 * Base44 legado: a entidade TransicaoPedidoCompra não existe no app — usa campo `historico` do pedido.
 */
import { base44 } from '@/api/base44Client';
import { agora, formatarLogTime } from '@/components/utils/dateUtils';
import { isEntityLinkedToSupabase } from '@/integrations/p38/entityTableMap';
import { getP38Providers, resolveP38ProviderName } from '@/integrations/p38/providers';

function formatHistoricoLine({
  statusAnterior,
  statusNovo,
  responsavel,
  codigoOperacao = '',
  observacao = '',
  tipoAutenticacao = 'Usuario',
}) {
  const nome = responsavel?.nome || responsavel?.full_name || 'Usuário';
  const ref = codigoOperacao ? ` | Ref: ${codigoOperacao}` : '';
  const obs = observacao ? ` | ${observacao}` : '';
  return `\n[Transição ${statusAnterior || '?'} → ${statusNovo}: ${nome} (${tipoAutenticacao})${ref}${obs} | ${formatarLogTime()}]`;
}

async function appendHistoricoFallback(params) {
  const { pedidoId, historicoAtual } = params;
  const line = formatHistoricoLine(params);
  let historico = historicoAtual;
  if (historico === undefined) {
    const rows = await base44.entities.PedidoCompra.filter({ id: pedidoId });
    historico = rows[0]?.historico || '';
  }
  await base44.entities.PedidoCompra.update(pedidoId, {
    historico: (historico || '') + line,
  });
}

function shouldUseTransicaoEntityTable() {
  const providers = getP38Providers();
  return (
    resolveP38ProviderName() === providers.SUPABASE &&
    isEntityLinkedToSupabase('TransicaoPedidoCompra')
  );
}

/**
 * Registra uma transição de status no log da entidade TransicaoPedidoCompra (Supabase)
 * ou no campo `historico` do PedidoCompra (Base44 legado).
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
 * @param {string} [params.historicoAtual] - Evita leitura extra do pedido no fallback
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
  historicoAtual,
}) {
  if (shouldUseTransicaoEntityTable()) {
    try {
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
        data_transicao: agora(),
      });
      return;
    } catch (error) {
      console.warn('[registrarTransicao] falha na tabela transicao_pedido_compra; usando historico', error);
    }
  }

  await appendHistoricoFallback({
    pedidoId,
    pedidoNumero,
    statusAnterior,
    statusNovo,
    responsavel,
    codigoOperacao,
    observacao,
    tipoAutenticacao,
    historicoAtual,
  });
}
