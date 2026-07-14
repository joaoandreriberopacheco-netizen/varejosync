import React from 'react';
import { CalendarDays } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ordenarContasCorteDiario } from '@/lib/corteDiarioMapa';
import { contaUsaRegraCaixaPDV } from '@/lib/saldoContaFinanceira';

const PERIODO_CHIPS = [
  { v: 'hoje', l: 'Hoje' },
  { v: 'ontem', l: 'Ontem' },
  { v: 'semana', l: 'Semana' },
  { v: 'mes', l: 'Mês' },
  { v: 'tudo', l: 'Tudo' },
];

const CHIP_ACTIVE = 'bg-primary text-primary-foreground dark:bg-[#a4ce33] dark:text-[#1f1d22]';
const CHIP_INACTIVE = 'bg-card text-muted-foreground shadow-sm dark:bg-muted';

/**
 * Filtros simples para o diálogo de relatórios — sem Popover (evita bloqueio de cliques no Dialog).
 */
export default function RelatoriosFiltros({
  periodo,
  onPeriodo,
  customStart = '',
  customEnd = '',
  onCustomStart,
  onCustomEnd,
  contas = [],
  contasSel = [],
  onContasSel,
}) {
  const contasOrdenadas = ordenarContasCorteDiario(contas.filter((c) => c.ativo !== false));

  const toggleConta = (id) => {
    const next = contasSel.includes(id)
      ? contasSel.filter((item) => item !== id)
      : [...contasSel, id];
    onContasSel(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] bg-muted/40 p-3 dark:bg-muted/60">
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span className="text-[11px] uppercase tracking-wide">Período</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {PERIODO_CHIPS.map((chip) => (
            <button
              key={chip.v}
              type="button"
              onClick={() => onPeriodo(chip.v)}
              className={`rounded-full px-2 py-2 text-xs font-medium transition-colors ${
                periodo === chip.v ? CHIP_ACTIVE : CHIP_INACTIVE
              }`}
            >
              {chip.l}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] text-muted-foreground">De</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                onPeriodo('periodo');
                onCustomStart(e.target.value);
              }}
              className="w-full rounded-xl border-0 bg-card px-2 py-2 text-xs shadow-sm dark:bg-card"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] text-muted-foreground">Até</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                onPeriodo('periodo');
                onCustomEnd(e.target.value);
              }}
              className="w-full rounded-xl border-0 bg-card px-2 py-2 text-xs shadow-sm dark:bg-card"
            />
          </label>
        </div>
      </div>

      <div className="rounded-[24px] bg-muted/40 p-3 dark:bg-muted/60">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Contas
        </p>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {contasOrdenadas.map((conta) => (
            <label
              key={conta.id}
              className="flex cursor-pointer items-center gap-3 rounded-2xl px-2 py-2 hover:bg-muted/40"
            >
              <Checkbox
                checked={contasSel.includes(conta.id)}
                onCheckedChange={() => toggleConta(conta.id)}
                className="h-4 w-4"
              />
              <span className="text-xs text-foreground/90">{conta.nome}</span>
              {contaUsaRegraCaixaPDV(conta) && (
                <span className="ml-auto text-[10px] text-muted-foreground">PDV</span>
              )}
              {conta.is_caixa_geral && (
                <span className="ml-auto text-[10px] text-muted-foreground">Geral</span>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
