import React, { useMemo, useState } from 'react';
import { ChevronDown, Package2, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
        <div className="px-3 pb-3 space-y-2">
          {itensOrdenados.map((item, index) => {
            const quantidade = item.quantidade_embarcada || item.quantidade || 0;
            const custo = item.custo_unitario || 0;
            return (
              <div key={`${item.produto_id || item.produto_nome}-${index}`} className="rounded-2xl bg-white dark:bg-gray-800 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.produto_nome || 'Item sem descrição'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Quantidade: {quantidade}</p>
                  </div>
                  <Badge className="border-0 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 shadow-none">
                    {(quantidade * custo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 px-2.5 py-2">
                    <p className="text-gray-500 dark:text-gray-400">Valor compra</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 px-2.5 py-2">
                    <p className="text-gray-500 dark:text-gray-400">Valor total</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{(quantidade * custo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                </div>
              </div>
            );
          })}
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