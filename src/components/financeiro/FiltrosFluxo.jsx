import React, { useState } from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dataHoje } from '@/components/utils/dateUtils';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

const PERIODOS = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Ontem', value: 'ontem' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mês', value: 'mes' },
  { label: 'Tudo', value: 'tudo' },
  { label: 'Período', value: 'periodo' },
];

const parseDateKey = (dateKey) => new Date(`${dateKey}T12:00:00Z`);

export function getDateRange(periodo, customStart, customEnd) {
  const hoje = parseDateKey(dataHoje());
  switch (periodo) {
    case 'hoje':
      return { start: hoje, end: hoje };
    case 'ontem': {
      const ontem = subDays(hoje, 1);
      return { start: ontem, end: ontem };
    }
    case 'semana':
      return { start: startOfWeek(hoje, { locale: ptBR }), end: endOfWeek(hoje, { locale: ptBR }) };
    case 'mes':
      return { start: startOfMonth(hoje), end: endOfMonth(hoje) };
    case 'tudo':
      return { start: null, end: null };
    case 'periodo':
      return { start: customStart ? parseDateKey(customStart) : null, end: customEnd ? parseDateKey(customEnd) : null };
    default:
      return { start: startOfMonth(hoje), end: endOfMonth(hoje) };
  }
}

export default function FiltrosFluxo({
  periodo, onPeriodoChange,
  customStart, customEnd, onCustomChange,
  contas, contasSelecionadas, onContasChange,
  apenasPendentes, onPendentesChange
}) {
  const [openContas, setOpenContas] = useState(false);
  const todasSelecionadas = contasSelecionadas.length === 0 || contasSelecionadas.length === contas.length;

  const toggleConta = (id) => {
    if (contasSelecionadas.includes(id)) {
      onContasChange(contasSelecionadas.filter(c => c !== id));
    } else {
      onContasChange([...contasSelecionadas, id]);
    }
  };

  const labelContas = todasSelecionadas
    ? 'Todas as contas'
    : `${contasSelecionadas.length} conta${contasSelecionadas.length > 1 ? 's' : ''}`;

  return (
    <div className="w-full min-w-0 space-y-2">
      {/* Chips de período — scroll horizontal sem barra visível */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {PERIODOS.map(p => (
          <button
            key={p.value}
            onClick={() => onPeriodoChange(p.value)}
            className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              periodo === p.value
                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Datas customizadas */}
      {periodo === 'periodo' && (
        <div className="flex gap-2 items-center">
          <Input
            type="date"
            value={customStart || ''}
            onChange={e => onCustomChange('start', e.target.value)}
            className="h-8 text-xs flex-1 min-w-0 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
          <span className="text-xs text-gray-400 flex-none">até</span>
          <Input
            type="date"
            value={customEnd || ''}
            onChange={e => onCustomChange('end', e.target.value)}
            className="h-8 text-xs flex-1 min-w-0 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      )}

      {/* Filtros secundários */}
      <div
        className="flex gap-2 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Contas */}
        <Popover open={openContas} onOpenChange={setOpenContas}>
          <PopoverTrigger asChild>
            <button className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !todasSelecionadas
                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              <SlidersHorizontal className="w-3 h-3 flex-none" />
              <span className="truncate max-w-[120px]">{labelContas}</span>
              <ChevronDown className="w-3 h-3 flex-none" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2 dark:bg-gray-800 dark:border-gray-700" align="start">
            <div className="space-y-1">
              <button
                onClick={() => onContasChange([])}
                className={`w-full flex items-center px-2 py-1.5 rounded text-xs text-left transition-colors ${
                  todasSelecionadas ? 'bg-gray-100 dark:bg-gray-700 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                } text-gray-700 dark:text-gray-200`}
              >
                Todas as contas
              </button>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-1 space-y-0.5">
                {contas.map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <Checkbox
                      checked={contasSelecionadas.includes(c.id)}
                      onCheckedChange={() => toggleConta(c.id)}
                      className="w-3.5 h-3.5"
                    />
                    <div className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: c.cor || '#10B981' }} />
                    <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{c.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Pendentes */}
        <button
          onClick={() => onPendentesChange(!apenasPendentes)}
          className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            apenasPendentes
              ? 'bg-amber-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          Não conciliados
        </button>
      </div>
    </div>
  );
}