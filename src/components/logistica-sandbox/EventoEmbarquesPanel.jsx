import React, { useMemo, useState } from 'react';
import { ChevronDown, Package2, ShoppingCart } from 'lucide-react';

function ordenarItens(itens = []) {
  return [...itens].sort((a, b) => (a.produto_nome || '').localeCompare(b.produto_nome || '', 'pt-BR'));
}

function resumoEmbarque(embarque) {
  const itens = embarque.itens || [];
  return {
    totalCompra: itens.reduce((sum, item) => {
      const quantidade = item.quantidade_embarcada ?? item.quantidade_pedida ?? item.quantidade ?? 0;
      const custo = item.custo_unitario ?? item.custo_unitario_momento ?? item.valor_unitario ?? 0;
      return sum + (quantidade * custo);
    }, 0),
    quantidadeItens: itens.length,
    quantidadeSomada: itens.reduce((sum, item) => sum + (item.quantidade_embarcada ?? item.quantidade_pedida ?? item.quantidade ?? 0), 0),
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
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm flex-shrink-0">
              <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{embarque.fornecedor_nome || 'Fornecedor'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{embarque.numero || embarque.codigo || 'Compra vinculada'}</p>
            </div>
            <div className="text-right flex-shrink-0 pr-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{resumo.totalCompra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 mt-1 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="px-1 pb-1 pt-2">
          <div className="grid grid-cols-[52px_minmax(0,1fr)_80px] gap-2 px-2 pb-2 text-[10px] uppercase tracking-[0.08em] text-gray-400 dark:text-gray-300">
            <span>Qtd</span>
            <span className="text-center">Descrição</span>
            <span className="text-right">Vlr Tot</span>
          </div>
          <div className="space-y-2">
            {itensOrdenados.map((item, index) => {
              const quantidade = item.quantidade_embarcada ?? item.quantidade_pedida ?? item.quantidade ?? 0;
              const custo = item.custo_unitario ?? item.custo_unitario_momento ?? item.valor_unitario ?? 0;
              const total = quantidade * custo;
              return (
                <div key={`${item.produto_id || item.produto_nome}-${index}`} className="grid grid-cols-[52px_minmax(0,1fr)_80px] gap-2 px-2 py-2 text-[13px] text-gray-100 dark:text-gray-100">
                  <span className="text-gray-100 dark:text-gray-100">{quantidade}</span>
                  <div className="min-w-0 text-center">
                    <p className="leading-tight break-words font-normal text-gray-100 dark:text-gray-100">{item.produto_nome || 'Item sem descrição'}</p>
                    <p className="mt-1 text-[11px] text-gray-300 dark:text-gray-300">{custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} un.</p>
                  </div>
                  <span className="text-right font-normal whitespace-nowrap text-gray-100 dark:text-gray-100">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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
  const resumoGeral = useMemo(() => {
    return embarques.reduce((acc, embarque) => {
      const resumo = resumoEmbarque(embarque);
      acc.total += resumo.totalCompra;
      acc.quantidade += 1;
      return acc;
    }, { total: 0, quantidade: 0 });
  }, [embarques]);

  if (!embarques.length) {
    return (
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm text-xs text-gray-500 dark:text-gray-400">
        Nenhuma compra vinculada a este evento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 px-3 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-3 text-sm text-gray-100 dark:text-gray-100">
          <span>{resumoGeral.quantidade} Compra{resumoGeral.quantidade > 1 ? 's' : ''}</span>
          <span className="font-semibold whitespace-nowrap">{resumoGeral.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      </div>
      <div className="space-y-2">
        {embarques.map((embarque, index) => (
          <EmbarqueCard key={embarque.id || index} embarque={embarque} defaultOpen={index === 0} />
        ))}
      </div>
    </div>
  );
}