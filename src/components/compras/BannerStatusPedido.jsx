import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Banner contextual no topo do PedidoCompraForm.
 * Reforça o vínculo com aprovações financeiras e o caminho de correção (FAB → Solicitar correção).
 */
export default function BannerStatusPedido({ pedido, isMobile = false }) {
  if (!pedido) return null;

  const saf = pedido.status_aprovacao_financeira;
  const isAguardandoFin =
    pedido.status === 'Aguardando Aprovação Financeira' ||
    pedido.status === 'Aguardando Liberação' ||
    saf === 'Aguardando Aprovação Financeira';
  const solicitacaoPendente = saf === 'Solicitação de Edição Pendente';
  const financeiroLiberado =
    saf === 'Aprovado Financeiramente' ||
    saf === 'Aprovado' ||
    (['Aprovado', 'Despachado', 'Em Recepção', 'Concluído', 'Aguardando Recepção'].includes(pedido.status) &&
      saf !== 'Aguardando Aprovação Financeira' &&
      saf !== 'Pendente' &&
      !solicitacaoPendente);

  const baseClass = isMobile
    ? 'px-3 py-2 border-b'
    : 'px-4 py-2.5 border-b flex-shrink-0';

  if (solicitacaoPendente) {
    return (
      <div className={`${baseClass} bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800`}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <span className="font-medium">Correção solicitada.</span>{' '}
            {isMobile
              ? 'Aguarde o financeiro liberar a edição.'
              : 'O financeiro vê este pedido em Aprovações Financeiras e libera a edição quando possível.'}
          </div>
        </div>
      </div>
    );
  }

  if (isAguardandoFin) {
    return (
      <div className={`${baseClass} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800`}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-800 dark:text-yellow-200">
            <span className="font-medium">Aguardando aprovação financeira.</span>{' '}
            {isMobile
              ? 'Edição bloqueada até o financeiro aprovar.'
              : 'Edição bloqueada até o financeiro aprovar. Se precisar alterar antes da decisão, peça ao financeiro rejeitar ou use o fluxo de correção após aprovação.'}
          </div>
        </div>
      </div>
    );
  }

  if (financeiroLiberado) {
    return (
      <div className="bg-lime-50 px-4 py-2.5 opacity-100 border-b flex-shrink-0 dark:bg-lime-900/20 border-lime-100 dark:border-lime-800">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-lime-600 dark:text-lime-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-lime-800 dark:text-lime-200">
            <span className="font-medium">Aprovado financeiramente.</span>{' '}
            {isMobile
              ? 'Valores já passaram pelo financeiro. Para corrigir: menu flutuante → Solicitar correção.'
              : 'Valores já passaram pelo financeiro. Para corrigir dados (ex.: valor digitado errado): abra o menu flutuante (canto inferior direito) e toque em Solicitar correção — o financeiro libera a edição em Aprovações Financeiras.'}
          </div>
        </div>
      </div>
    );
  }

  return null;
}