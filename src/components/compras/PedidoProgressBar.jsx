import React from 'react';
import { differenceInDays, parseISO } from 'date-fns';

function getProgressDetails(pedido) {
  const today = new Date();
  const dataPrevista = pedido.data_prevista_entrega
    ? parseISO(pedido.data_prevista_entrega + 'T00:00:00')
    : null;
  const isAtrasado = dataPrevista && differenceInDays(today, dataPrevista) > 0;

  const status = pedido.status || '';

  // Problemas — vermelho sempre tem prioridade
  if (pedido.tem_divergencias || status === 'Pend\u00eancia' || status === 'Devolvido' || isAtrasado)
    return { filled: 2, active: 'rose' };

  // Fluxo normal — 1 seg por etapa
  if (status === 'Cancelado')                 return { filled: 0, active: null };
  if (status === 'Rascunho')                  return { filled: 1, active: 'teal-light' };
  if (status === 'Aguardando Libera\u00e7\u00e3o')       return { filled: 2, active: 'teal-light' };
  if (status === 'Aprovado')                  return { filled: 3, active: 'teal-mid' };
  if (status === 'Despachado')                return { filled: 4, active: 'teal' };
  if (status === 'Em Recep\u00e7\u00e3o')               return { filled: 4, active: 'teal' };
  if (status === 'Conclu\u00eddo')                    return { filled: 5, active: 'teal-full' };

  return { filled: 1, active: 'teal-light' };
}

const PALETTE = {
  'teal-light': ['#b2d8d8', '#a0cece', '#8ec4c4', '#7cbaba', '#6ab0b0'],
  'teal-mid':   ['#5eada8', '#4da39e', '#3d9994', '#2d8f8a', '#1e8580'],
  'teal':       ['#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59'],
  'teal-full':  ['#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e'],
  'rose':       ['#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c'],
};

// Altura cresce da esquerda para direita — efeito medidor 3D
const HEIGHTS = [4, 6, 8, 10, 13];

export default function PedidoProgressBar({ pedido }) {
  const { filled, active } = getProgressDetails(pedido);
  const palette = active ? PALETTE[active] : [];

  if (filled === 0) return null;

  return (
    <div className="flex items-end gap-[3px] mt-2.5 w-full">
      {HEIGHTS.map((h, i) => {
        const isActive = i < filled;
        const bg = isActive ? palette[i] : undefined;
        return (
          <div
            key={i}
            className={`flex-1 rounded-[2px] transition-all duration-300 ${!isActive ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            style={{
              height: `${h}px`,
              backgroundColor: isActive ? bg : undefined,
              boxShadow: isActive ? `0 1px 4px ${bg}99` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}