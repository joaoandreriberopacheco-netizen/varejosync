import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FREQUENCIAS = ['Semanal', 'Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual', 'Parcelado'];

export default function RecorrenciaConfig({ isRecorrente, onToggle, frequencia, onFrequencia, parcelas, onParcelas, dataFim, onDataFim }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm p-4 space-y-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground/90">Recorrência / Parcelamento</p>
        </div>
        <button
          type="button"
          onClick={() => onToggle(!isRecorrente)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-none ${isRecorrente ? 'bg-primary dark:bg-gray-200' : 'bg-gray-300 dark:bg-gray-600'}`}>
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isRecorrente ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {isRecorrente && (
        <>
          {/* Frequência */}
          <div className="bg-muted/40 dark:bg-muted rounded-xl overflow-hidden">
            <Select value={frequencia} onValueChange={onFrequencia}>
              <SelectTrigger className="border-0 shadow-none bg-transparent h-11 dark:text-foreground text-sm px-4">
                <SelectValue placeholder="Frequência *" />
              </SelectTrigger>
              <SelectContent className="z-[70] dark:bg-muted dark:border-border/40">
                {FREQUENCIAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Parcelado: número de parcelas */}
          {frequencia === 'Parcelado' && (
            <div className="bg-muted/40 dark:bg-muted rounded-xl px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Número de Parcelas</p>
              <input autoComplete="off"
                type="number"
                min="2"
                max="120"
                value={parcelas}
                onChange={e => onParcelas(parseInt(e.target.value) || 2)}
                className="w-full bg-transparent text-sm text-foreground outline-none"
                placeholder="Ex: 12"
              />
            </div>
          )}

          {/* Data de fim (para recorrências não parceladas) */}
          {frequencia && frequencia !== 'Parcelado' && (
            <div className="bg-muted/40 dark:bg-muted rounded-xl px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Encerrar em (opcional)</p>
              <input autoComplete="off"
                type="date"
                value={dataFim}
                onChange={e => onDataFim(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}