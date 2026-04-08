import React, { useMemo, useState } from 'react';
import { ChevronDown, Package2, ShoppingCart } from 'lucide-react';

function ordenarItens(itens = []) {
  return [...itens].sort((a, b) => (a.produto_nome || '').localeCompare(b.produto_nome || '', 'pt-BR'));
}

function resumoEmbarque(embarque) {
  const itens = embarque.itens || [];
  return {
    totalCompra: itens.reduce((sum, item) => sum + ((item.quantidade_embarcada || item.quantidade || 0) * (item.custo_unitario || 0)), 0),
    quantidadeItens: itens.length,
    quantidadeSomada: itens.reduce((sum, item) => sum + (item.quantidade_embarcada || item.quantidade || 0), 0),
  };
}

function EmbarqueCard({ embarque, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const itensOrdenados = useMemo(() => ordenarItens(embarque.itens), [embarque.itens]);
  const resumo = useMemo(() => resumoEmbarque(embarque), [embarque]);

  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full p-3 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{embarque.fornecedor_nome || 'Fornecedor'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{embarque.numero || embarque.codigo || 'Embarque vinculado'}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-2xl bg-white dark:bg-gray-800 px-2.5 py-2 shadow-sm">
                <p className="text-gray-500 dark:text-gray-400">Compra</p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{resumo.totalCompra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-gray-800 px-2.5 py-2 shadow-sm">
                <p className="text-gray-500 dark:text-gray-400">Itens</p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{resumo.quantidadeItens}</p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-gray-800 px-2.5 py-2 shadow-sm">
                <p className="text-gray-500 dark:text-gray-400">Qtd total</p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{resumo.quantidadeSomada}</p>
              </div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 mt-1 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="px-1 pb-1 pt-2">
          <div className="grid grid-cols-[52px_minmax(0,1fr)_80px] gap-2 px-2 pb-2 text-[10px] uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
            <span>Qtd</span>
            <span>Descrição</span>
            <span className="text-right">Vlr Tot</span>
          </div>
          <div className="space-y-2">
            {itensOrdenados.map((item, index) => {
              const quantidade = item.quantidade_embarcada || item.quantidade || 0;
              const custo = item.custo_unitario || 0;
              const total = quantidade * custo;
              return (
                <div key={`${item.produto_id || item.produto_nome}-${index}`} className="grid grid-cols-[52px_minmax(0,1fr)_80px] gap-2 px-2 py-2 text-sm text-gray-900 dark:text-gray-100">
                  <span className="text-gray-600 dark:text-gray-300">{quantidade}</span>
                  <div className="min-w-0">
                    <p className="font-medium leading-tight break-words">{item.produto_nome || 'Item sem descrição'}</p>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} un.</p>
                  </div>
                  <span className="text-right font-semibold whitespace-nowrap">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EventoEmbarquesPanel({ embarques = [] }) {
  if (!embarques.length) {
    return (
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm text-xs text-gray-500 dark:text-gray-400">
        Nenhum embarque vinculado a este evento.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {embarques.map((embarque, index) => (
        <EmbarqueCard key={embarque.id || index} embarque={embarque} defaultOpen={index === 0} />
      ))}
    </div>
  );
}