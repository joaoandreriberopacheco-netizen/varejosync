import React from 'react';

function getProgressDetails(pedido) {
  const statusPedido = pedido.status || '';
  const embarque = pedido._embarque || {};
  const statusBase = pedido._display_status || statusPedido;
  const itensEmbarque = embarque.itens || embarque.itens_embarcados || [];
  const temItensAssociados = itensEmbarque.some((item) => (Number(item?.quantidade_embarcada) || 0) > 0);
  const temTransporte = !!(embarque.transportadora_id || embarque.transportadora_nome || embarque.data_embarque || embarque.eta);
  const quantidadePendente = pedido._quantidade_pendente ?? 0;
  const necessidadeSemItens = embarque.tipo === 'Necessidade' && !temTransporte && (!temItensAssociados || quantidadePendente > 0);

  if (necessidadeSemItens || statusBase === 'Aguardando') return { filled: 3, active: 'rose' };
  if (statusBase === 'Concluído') return { filled: 5, active: 'teal-full' };
  if (statusBase === 'Despachado') return { filled: 4, active: 'teal' };
  if (statusBase === 'Aprovado') return { filled: 3, active: 'teal-mid' };
  if (statusBase === 'Aguardando Aprovação Financeira' || statusBase === 'Aguardando Liberação') return { filled: 2, active: 'teal-light' };
  if (statusBase === 'Rascunho') return { filled: 1, active: 'teal-light' };

  return { filled: 1, active: 'teal-light' };
}

const PALETTE = {
  'teal-light': ['#b2d8d8', '#a0cece', '#8ec4c4', '#7cbaba', '#6ab0b0'],
  'teal-mid':   ['#5eada8', '#4da39e', '#3d9994', '#2d8f8a', '#1e8580'],
  'teal':       ['#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59'],
  'teal-full':  ['#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e'],
  'rose':       ['#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c'],
  'amber':      ['#fde68a', '#fbbf24', '#f59e0b', '#d97706', '#b45309'],
};

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