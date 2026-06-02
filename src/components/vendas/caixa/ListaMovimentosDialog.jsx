import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { VirtualizedList } from '@/components/ui/virtualized-list';
import { ArrowLeft, Plus, Minus, DollarSign, Receipt, Pencil, RefreshCw } from 'lucide-react';
import { formatarDataHora } from '@/components/utils/dateUtils';

export default function ListaMovimentosDialog({ open, onOpenChange, tipo, movimentos, despesasLista, totalReforcos, totalSangrias, totalDespesas, formatValor, onSelectMovimento, onRefresh }) {

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
          <button onClick={onRefresh} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" style={{ minWidth: '44px', minHeight: '44px' }}>
            <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
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
            <VirtualizedList
              items={listaFiltrada}
              estimateSize={isDespesas ? 96 : 132}
              className="h-[calc(100vh-190px)] pr-1"
              contentClassName="max-w-4xl mx-auto"
              itemClassName="pb-3"
              getItemKey={(item) => item.id}
              renderItem={(item) => {
                if (isDespesas) {
                  return (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{item.descricao}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.categoria} · {item.created_date ? formatarDataHora(item.created_date).split(' ')[1] : ''}</div>
                        </div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-glacial">−{formatValor(item.valor)}</div>
                      </div>
                    </div>
                  );
                }

                const cancelado = item.status_registro === 'Cancelado';
                const editado = item.status_registro === 'Editado';

                return (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className={`text-sm font-semibold ${cancelado ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{item.numero}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatarDataHora(item.created_date).split(' ')[1]}</span>
                          {cancelado && <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Cancelado</span>}
                          {editado && <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Editado</span>}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.usuario_responsavel_nome}</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className={`text-2xl font-bold font-glacial ${cancelado ? 'line-through opacity-50 ' : ''}${corTotal}`}>
                          {sinal}{formatValor(item.valor)}
                        </div>
                        {onSelectMovimento && (
                          <button onClick={() => onSelectMovimento(item)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Pencil className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                    {item.observacao && (
                      <div className={`text-sm pt-3 border-t border-gray-100 dark:border-gray-700 ${cancelado ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>{item.observacao}</div>
                    )}
                    {item.motivo_ajuste && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Motivo: {item.motivo_ajuste}</div>
                    )}
                  </div>
                );
              }}
            />
          )}
        </div>

        {listaFiltrada.length > 0 && (
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center max-w-4xl mx-auto">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total do Turno</span>
              <span className={`text-2xl font-bold font-glacial ${corTotal}`}>
                {sinal}{formatValor(listaFiltrada.filter(item => item.status_registro !== 'Cancelado').reduce((sum, item) => sum + (item.valor || 0), 0))}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}