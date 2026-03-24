import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Minus, DollarSign, Receipt } from 'lucide-react';
import { format } from 'date-fns';

export default function ListaMovimentosDialog({ open, onOpenChange, tipo, movimentos, despesasLista, totalReforcos, totalSangrias, totalDespesas, formatValor }) {

  const isReforcos = tipo === 'reforcos';
  const isSangrias = tipo === 'sangrias';
  const isDespesas = tipo === 'despesas';
  const isVendas = tipo === 'vendas';

  const titulo = isReforcos ? 'Reforços do Turno' : isSangrias ? 'Recolhimentos do Turno' : isDespesas ? 'Despesas do Turno' : 'Movimentações';

  const listaFiltrada = isReforcos
    ? movimentos.filter(m => m.tipo === 'Reforço')
    : isSangrias
    ? movimentos.filter(m => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa')
    : isDespesas
    ? (despesasLista || [])
    : [];

  const total = isReforcos ? totalReforcos : isSangrias ? totalSangrias : isDespesas ? totalDespesas : 0;
  const corTotal = isReforcos ? 'text-emerald-600 dark:text-emerald-400' : isSangrias ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
  const sinal = isReforcos ? '+' : '−';

  const EmptyIcon = isReforcos ? Plus : isSangrias ? Minus : DollarSign;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
          <button onClick={() => onOpenChange(false)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" style={{ minWidth: '44px', minHeight: '44px' }}>
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">{titulo}</h2>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {listaFiltrada.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <EmptyIcon className="w-10 h-10 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-base font-medium text-gray-600 dark:text-gray-400">Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-4xl mx-auto">
              {isDespesas ? listaFiltrada.map((d) => (
                <div key={d.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{d.descricao}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{d.categoria} · {d.created_date ? format(new Date(d.created_date), 'HH:mm') : ''}</div>
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-glacial">−{formatValor(d.valor)}</div>
                  </div>
                </div>
              )) : listaFiltrada.map((mov) => (
                <div key={mov.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{mov.numero}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(mov.created_date), 'HH:mm')}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{mov.usuario_responsavel_nome}</div>
                    </div>
                    <div className={`text-2xl font-bold font-glacial ${corTotal}`}>
                      {sinal}{formatValor(mov.valor)}
                    </div>
                  </div>
                  {mov.observacao && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 pt-3 border-t border-gray-100 dark:border-gray-700">{mov.observacao}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {listaFiltrada.length > 0 && (
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center max-w-4xl mx-auto">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total do Turno</span>
              <span className={`text-2xl font-bold font-glacial ${corTotal}`}>
                {sinal}{formatValor(total)}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}