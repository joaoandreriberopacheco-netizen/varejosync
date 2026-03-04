import React, { useState } from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const PERIODOS = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Ontem', value: 'ontem' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mês', value: 'mes' },
  { label: 'Tudo', value: 'tudo' },
  { label: 'Período', value: 'periodo' },
];

export function getDateRange(periodo, customStart, customEnd) {
  const hoje = new Date();
  switch (periodo) {
    case 'hoje':
      return { start: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()), end: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59) };
    case 'ontem': {
      const ontem = subDays(hoje, 1);
      return { start: new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate()), end: new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59) };
    }
    case 'semana':
      return { start: startOfWeek(hoje, { locale: ptBR }), end: endOfWeek(hoje, { locale: ptBR }) };
    case 'mes':
      return { start: startOfMonth(hoje), end: endOfMonth(hoje) };
    case 'tudo':
      return { start: null, end: null };
    case 'periodo':
      return { start: customStart ? new Date(customStart) : null, end: customEnd ? new Date(customEnd) : null };
    default:
      return { start: startOfMonth(hoje), end: endOfMonth(hoje) };
  }
}

export default function FiltrosFluxo({ periodo, onPeriodoChange, customStart, customEnd, onCustomChange, contas, contasSelecionadas, onContasChange, apenasPendentes, onPendentesChange }) {
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
    <div className="space-y-2">
      {/* Filtro de período — scroll horizontal, sem quebra */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {PERIODOS.map(p => (
          <button
            key={p.value}
            onClick={() => onPeriodoChange(p.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              periodo === p.value
                ? 'bg-gray-700 dark:bg-gray-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Período customizado */}
      {periodo === 'periodo' && (
        <div className="flex gap-2 items-center overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
          <Input
            type="date"
            value={customStart || ''}
            onChange={e => onCustomChange('start', e.target.value)}
            className="h-8 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 min-w-[130px]"
          />
          <span className="text-xs text-gray-400 flex-shrink-0">até</span>
          <Input
            type="date"
            value={customEnd || ''}
            onChange={e => onCustomChange('end', e.target.value)}
            className="h-8 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 min-w-[130px]"
          />
        </div>
      )}

      {/* Filtros secundários: contas + pendentes — scroll horizontal */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5 items-center" style={{ scrollbarWidth: 'none' }}>
        {/* Selector de contas */}
        <Popover open={openContas} onOpenChange={setOpenContas}>
          <PopoverTrigger asChild>
            <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !todasSelecionadas
                ? 'bg-gray-700 dark:bg-gray-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>
              <SlidersHorizontal className="w-3 h-3" />
              {labelContas}
              <ChevronDown className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 dark:bg-gray-800 dark:border-gray-700" align="start">
            <div className="space-y-1">
              <button
                onClick={() => onContasChange([])}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                  todasSelecionadas ? 'bg-gray-100 dark:bg-gray-700 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                } text-gray-700 dark:text-gray-200`}
              >
                Todas as contas
              </button>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-1 space-y-1">
                {contas.map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <Checkbox
                      checked={contasSelecionadas.includes(c.id)}
                      onCheckedChange={() => toggleConta(c.id)}
                      className="w-3.5 h-3.5"
                    />
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.cor || '#10B981' }} />
                    <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{c.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Toggle pendentes */}
        <button
          onClick={() => onPendentesChange(!apenasPendentes)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            apenasPendentes
              ? 'bg-amber-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Não conciliados
        </button>
      </div>
    </div>
  );
}