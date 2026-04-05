import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function AgefinAtualizacaoDialog({ open, recorrencia, onClose, onConfirm }) {
  const [periodos, setPeriodos] = useState(1);
  const [updateMode, setUpdateMode] = useState('periodo'); // 'periodo' ou 'multiplos'

  const handleIncrement = () => setPeriodos(p => Math.min(p + 1, 12));
  const handleDecrement = () => setPeriodos(p => Math.max(p - 1, 1));

  const totalValue = recorrencia.valor_previsto * periodos;
  const freqLabel = recorrencia.frequencia.toLowerCase();
  const periodoLabel = periodos === 1 ? `1 ${freqLabel}` : `${periodos} ${freqLabel}s`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl border-0 shadow-lg p-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Gerar Contas a Pagar
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {recorrencia.nome_despesa}
            </p>
          </div>

          {/* Period Selector */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Quantos períodos?</p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={handleDecrement}
                disabled={periodos <= 1}
                className="w-14 h-14 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-all active:scale-95"
              >
                <ChevronDown className="w-6 h-6 text-gray-900 dark:text-white" />
              </button>

              <div className="text-center">
                <p className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  {periodos}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {periodoLabel}
                </p>
              </div>

              <button
                onClick={handleIncrement}
                disabled={periodos >= 12}
                className="w-14 h-14 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-all active:scale-95"
              >
                <ChevronUp className="w-6 h-6 text-gray-900 dark:text-white" />
              </button>
            </div>

            <div className="border-t border-gray-300 dark:border-gray-700 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Valor Total</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Quick Period Selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Atalhos</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodos(p)}
                  className={`py-3 rounded-2xl font-semibold text-sm transition-all ${
                    periodos === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Update Mode */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Como atualizar?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setUpdateMode('periodo')}
                className={`p-3 rounded-2xl font-medium transition-all ${
                  updateMode === 'periodo'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              >
                Período Atual
              </button>
              <button
                onClick={() => setUpdateMode('multiplos')}
                className={`p-3 rounded-2xl font-medium transition-all ${
                  updateMode === 'multiplos'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              >
                Todos os Períodos
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-2xl h-14 font-semibold"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => onConfirm(recorrencia, periodos)}
              className="flex-1 rounded-2xl h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
            >
              Gerar {periodos} Conta{periodos > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}