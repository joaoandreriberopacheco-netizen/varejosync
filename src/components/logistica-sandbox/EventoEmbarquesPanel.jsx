import React, { useMemo, useState } from 'react';
import { ChevronDown, Package2, ShoppingCart, Layers3 } from 'lucide-react';

function ordenarItens(itens = []) {
  return [...itens].sort((a, b) => (a.produto_nome || '').localeCompare(b.produto_nome || '', 'pt-BR'));
}

function resumoEmbarque(embarque) {
  const itens = embarque.itens_embarcados || embarque.itens || [];
  const totalCompra = Number(embarque.valor_total_embarcado) || itens.reduce((sum, item) => {
    const quantidade = item.quantidade_embarcada ?? item.quantidade_pedida ?? item.quantidade ?? 0;
    const custo = item.custo_unitario ?? item.custo_unitario_momento ?? item.valor_unitario ?? item.total_unitario ?? 0;
    const totalItem = item.total ?? item.valor_total ?? (quantidade * custo);
    return sum + totalItem;
  }, 0);

  return {
    totalCompra,
    quantidadeItens: itens.length,
    quantidadeSomada: itens.reduce((sum, item) => sum + (item.quantidade_embarcada ?? item.quantidade_pedida ?? item.quantidade ?? 0), 0),
  };
}

function EmbarqueCard({ embarque, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const itensOrdenados = useMemo(() => ordenarItens(embarque.itens_embarcados || embarque.itens), [embarque.itens_embarcados, embarque.itens]);
  const resumo = useMemo(() => resumoEmbarque(embarque), [embarque]);

  return (
    <div className="rounded-2xl bg-[#334155]/82 dark:bg-[#334155]/82 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-3 py-3 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#253042] flex items-center justify-center shadow-sm flex-shrink-0">
              <ShoppingCart className="w-4 h-4 text-slate-200" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{embarque.fornecedor_nome || 'Fornecedor'}</p>
              <p className="text-[11px] text-slate-300 truncate">{embarque.pedido_compra_numero || embarque.numero || embarque.codigo || 'Compra vinculada'}</p>
            </div>
            <div className="text-right flex-shrink-0 pr-1">
              <p className="text-sm font-semibold text-white whitespace-nowrap">{resumo.totalCompra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="mx-2 mb-2 rounded-2xl bg-[#253042] px-2 py-2 shadow-inner">
          <div className="grid grid-cols-[52px_minmax(0,1fr)_80px] gap-2 px-2 pb-2 text-[10px] uppercase tracking-[0.08em] text-slate-300">
            <span>Qtd</span>
            <span className="text-center">Descrição</span>
            <span className="text-right">Vlr Tot</span>
          </div>
          <div className="space-y-1">
            {itensOrdenados.map((item, index) => {
              const quantidade = item.quantidade_embarcada ?? item.quantidade_pedida ?? item.quantidade ?? 0;
              const custo = item.custo_unitario ?? item.custo_unitario_momento ?? item.valor_unitario ?? item.total_unitario ?? 0;
              const total = item.total ?? item.valor_total ?? (quantidade * custo);
              return (
                <div key={`${item.produto_id || item.produto_nome}-${index}`} className="grid grid-cols-[52px_minmax(0,1fr)_80px] gap-2 px-2 py-2 text-[10px] text-white">
                  <span className="text-[10px] text-white">{quantidade}</span>
                  <div className="min-w-0 text-center">
                    <p className="text-[10px] leading-tight break-words font-normal text-white">{item.produto_nome || 'Item sem descrição'}</p>
                    <p className="mt-1 text-[10px] text-slate-300">{custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} un.</p>
                  </div>
                  <span className="text-[10px] text-right font-normal whitespace-nowrap text-white">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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
      <div className="rounded-2xl bg-[#334155]/82 dark:bg-[#334155]/82 px-3 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 text-sm text-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-2xl bg-[#253042] flex items-center justify-center shadow-sm flex-shrink-0">
              <Layers3 className="w-4 h-4 text-slate-200" />
            </div>
            <span>Compras vinculadas</span>
          </div>
          <span className="font-semibold whitespace-nowrap">{resumoGeral.quantidade} Compra{resumoGeral.quantidade > 1 ? 's' : ''}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 pl-10 text-sm text-white">
          <span className="text-slate-300">Valor total</span>
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