import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Banner contextual no topo do PedidoCompraForm.
 * Exibe mensagem amarela (aguardando) ou verde (aprovado) conforme o status do pedido.
 */
export default function BannerStatusPedido({ pedido, isMobile = false }) {
  if (!pedido) return null;

  const isAprovado = ['Aprovado', 'Despachado', 'Em Recepção', 'Concluído'].includes(pedido.status);
  const isAguardando = pedido.status === 'Aguardando Liberação' ||
  pedido.status_aprovacao_financeira === 'Aguardando Aprovação Financeira';

  if (!isAprovado && !isAguardando) return null;

  const baseClass = isMobile ?
  'px-3 py-2 border-b' :
  'px-4 py-2.5 border-b flex-shrink-0';

  if (isAprovado) {
    return (
      <div className="bg-lime-50 px-4 py-2.5 opacity-100 border-b flex-shrink-0 dark:bg-lime-900/20 border-lime-100 dark:border-lime-800">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-lime-600 dark:text-lime-400 flex-shrink-0 mt-0.5" />
          <div className={`text-xs text-lime-800 dark:text-lime-200`}>
            <span className="font-medium">Aprovado Financeiramente.</span>{' '}
            {isMobile ?
            'Pedido liberado para logística. Edição bloqueada.' :
            'Pedido liberado para logística. Para editar, um admin deve reabrir o pedido.'}
          </div>
        </div>
      </div>);

  }

  return (
    <div className={`${baseClass} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800`}>
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-800 dark:text-yellow-200">
          <span className="font-medium">Apenas Visualização.</span>{' '}
          {isMobile ?
          'Pedido aguardando aprovação financeira. Edição bloqueada.' :
          'Este pedido está aguardando aprovação financeira. Para editar, um admin deve reabrir o pedido.'}
        </div>
      </div>
    </div>);

}