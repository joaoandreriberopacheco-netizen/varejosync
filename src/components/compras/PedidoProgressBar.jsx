import React from 'react';
import { differenceInDays, parseISO } from 'date-fns';

// Retorna quantos segmentos preencher e a cor base
function getProgressDetails(pedido) {
  const today = new Date();
  const dataPrevista = pedido.data_prevista_entrega
    ? parseISO(pedido.data_prevista_entrega + 'T00:00:00')
    : null;
  const isAtrasado = dataPrevista && differenceInDays(today, dataPrevista) > 0;
  const isProximo  = dataPrevista && !isAtrasado && differenceInDays(dataPrevista, today) <= 5;

  if (pedido.status === 'Cancelado')  return { filled: 0, active: null };
  if (pedido.status === 'Rascunho')   return { filled: 1, active: 'teal-light' };

  if (pedido.tem_divergencias || pedido.status === 'Pendência' || pedido.status === 'Devolvido' || isAtrasado)
    return { filled: 2, active: 'rose' };

  if (pedido.status === 'Aguardando Liberação' || isProximo)
    return { filled: 3, active: 'teal-mid' };

  if (pedido.status === 'Concluído')
    return { filled: 5, active: 'teal-full' };

  // Aprovado / Despachado / Em Recepção
  return { filled: 4, active: 'teal' };
}

const SEGMENT_COLORS = {
  'teal-light': ['#b2d8d8', '#a0cece', '#8ec4c4', '#7cbaba', '#6ab0b0'],
  'teal-mid':   ['#5eada8', '#4da39e', '#3d9994', '#2d8f8a', '#1e8580'],
  'teal':       ['#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59'],
  'teal-full':  ['#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e'],
  'rose':       ['#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c'],
};

const INACTIVE = '#e5e7eb'; // gray-200
const INACTIVE_DARK = '#374151'; // gray-700

const HEIGHTS = [4, 6, 8, 10, 13]; // px — cresce da esquerda p/ direita

export default function PedidoProgressBar({ pedido }) {
  const { filled, active } = getProgressDetails(pedido);
  const palette = active ? SEGMENT_COLORS[active] : [];

  return (
    <div className="flex items-end gap-[3px] mt-2.5 w-full">
      {HEIGHTS.map((h, i) => {
        const isActive = i < filled;
        const bg = isActive ? palette[i] : undefined;
        return (
          <div
            key={i}
            className={`flex-1 rounded-[2px] transition-all duration-400 ${!isActive ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            style={{
              height: `${h}px`,
              backgroundColor: isActive ? bg : undefined,
              boxShadow: isActive ? `0 1px 3px ${bg}88` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}