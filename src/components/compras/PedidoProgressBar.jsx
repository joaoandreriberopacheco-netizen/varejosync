import React from 'react';
import { differenceInDays, parseISO } from 'date-fns';

function getProgressDetails(pedido) {
  const today = new Date();
  const dataPrevista = pedido.data_prevista_entrega
    ? parseISO(pedido.data_prevista_entrega + 'T00:00:00')
    : null;
  const isAtrasado = dataPrevista && differenceInDays(today, dataPrevista) > 0;
  const isProximo = dataPrevista && !isAtrasado && differenceInDays(dataPrevista, today) <= 5;

  if (pedido.status === 'Cancelado' || pedido.status === 'Rascunho') {
    return { width: 10, color: 'bg-teal-100 dark:bg-teal-900/20' };
  }
  if (pedido.status === 'Concluído') {
    return { width: 100, color: 'bg-teal-500 dark:bg-teal-400' };
  }
  if (pedido.tem_divergencias || pedido.status === 'Pendência' || pedido.status === 'Devolvido' || isAtrasado) {
    return { width: 25, color: 'bg-rose-300 dark:bg-rose-400' };
  }
  if (isProximo || pedido.status === 'Aguardando Liberação') {
    return { width: 50, color: 'bg-teal-300 dark:bg-teal-500' };
  }
  // Aprovado, Despachado, Em Recepção — normal
  return { width: 75, color: 'bg-teal-400 dark:bg-teal-400' };
}

export default function PedidoProgressBar({ pedido }) {
  const { width, color } = getProgressDetails(pedido);
  return (
    <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-2.5">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}