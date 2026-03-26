import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, UserRound, Package } from 'lucide-react';
import ConsumoResumoDialog from './ConsumoResumoDialog';

const formatCurrency = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function MovimentosConsumoDialog({ open, onOpenChange, consumos }) {
  const [selecionado, setSelecionado] = useState(null);

  const grupos = useMemo(() => {
    const map = new Map();
    (consumos || []).forEach((item) => {
      const key = item.destinacao || 'Sem destinação';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries()).map(([destinacao, items]) => ({
      destinacao,
      items,
      total: items.reduce((sum, item) => sum + (item.valor_total || 0), 0),
      quantidade: items.reduce((sum, item) => sum + (item.quantidade_total_itens || 0), 0),
    }));
  }, [consumos]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl rounded-[28px] border-0 bg-gray-50 p-0 shadow-2xl dark:bg-gray-900">
          <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <button onClick={() => onOpenChange(false)} className="rounded-2xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Consumo interno do turno</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Resumo por destinação, quem pegou e quem recebeu.</p>
            </div>
          </div>

          <div className="max-h-[75vh] space-y-4 overflow-y-auto p-4">
            {grupos.map((grupo) => (
              <div key={grupo.destinacao} className="rounded-[26px] bg-white p-4 shadow-sm dark:bg-gray-800">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{grupo.destinacao}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{grupo.items.length} registro(s) · {grupo.quantidade} item(ns)</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(grupo.total)}</p>
                </div>

                <div className="space-y-2">
                  {grupo.items.map((item) => (
                    <button key={item.id} onClick={() => setSelecionado(item)} className="flex w-full items-center justify-between rounded-2xl bg-gray-50 px-3 py-3 text-left shadow-sm transition hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-950">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                          <UserRound className="h-4 w-4 text-gray-400" />{item.usuario_solicitante_nome}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" />{item.quantidade_total_itens} item(ns)</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Recebeu: {item.responsavel_recebimento}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(item.valor_total)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.data_confirmacao ? new Date(item.data_confirmacao).toLocaleDateString('pt-BR') : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ConsumoResumoDialog open={!!selecionado} onOpenChange={() => setSelecionado(null)} consumo={selecionado} />
    </>
  );
}