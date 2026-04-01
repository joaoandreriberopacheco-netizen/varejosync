import React from 'react';
import { differenceInDays, parseISO } from 'date-fns';

const SEGMENTS = 5;

function getProgressDetails(pedido) {
  const today = new Date();
  const dataPrevista = pedido.data_prevista_entrega
    ? parseISO(pedido.data_prevista_entrega + 'T00:00:00')
    : null;
  const isAtrasado = dataPrevista && differenceInDays(today, dataPrevista) > 0;
  const isProximo = dataPrevista && !isAtrasado && differenceInDays(dataPrevista, today) <= 5;

  if (pedido.status === 'Cancelado') {
    return { filled: 0, colors: [] };
  }
  if (pedido.status === 'Rascunho') {
    return { filled: 1, colors: ['bg-teal-100 dark:bg-teal-900/30'] };
  }
  if (pedido.tem_divergencias || pedido.status === 'Pendência' || pedido.status === 'Devolvido' || isAtrasado) {
    // Crítico: 2 segmentos vermelhos
    return { filled: 2, colors: ['bg-rose-300 dark:bg-rose-500', 'bg-rose-400 dark:bg-rose-600'] };
  }
  if (pedido.status === 'Aguardando Liberação' || isProximo) {
    // Atenção: 3 segmentos teal médio
    return { filled: 3, colors: ['bg-teal-200 dark:bg-teal-700', 'bg-teal-300 dark:bg-teal-600', 'bg-teal-400 dark:bg-teal-500'] };
  }
  if (pedido.status === 'Concluído') {
    // Completo: 5 segmentos teal pleno
    return { filled: 5, colors: ['bg-teal-300', 'bg-teal-400', 'bg-teal-400', 'bg-teal-500', 'bg-teal-500'] };
  }
  // Normal (Aprovado, Despachado, Em Recepção): 4 segmentos
  return { filled: 4, colors: ['bg-teal-200 dark:bg-teal-700', 'bg-teal-300 dark:bg-teal-600', 'bg-teal-400 dark:bg-teal-500', 'bg-teal-500 dark:bg-teal-400'] };
}

export default function PedidoProgressBar({ pedido }) {
  const { filled, colors } = getProgressDetails(pedido);

  return (
    <div className="flex items-center gap-0.5 mt-2.5 w-full">
      {Array.from({ length: SEGMENTS }).map((_, i) => {
        const isActive = i < filled;
        const colorClass = isActive ? (colors[i] || 'bg-teal-400') : 'bg-gray-100 dark:bg-gray-700';
        // Altura cresce levemente a cada segmento para dar efeito de profundidade
        const height = 3 + i * 0.8;
        return (
          <div
            key={i}
            className={`flex-1 rounded-sm transition-all duration-300 ${colorClass}`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}