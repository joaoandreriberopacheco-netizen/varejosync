import React from 'react';
import { CalendarDays } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { dataHoje } from '@/components/utils/dateUtils';
import { ordenarContasCorteDiario } from '@/lib/corteDiarioMapa';

const CHIP_ACTIVE = 'bg-primary text-primary-foreground dark:bg-[#a4ce33] dark:text-[#1f1d22]';
const CHIP_INACTIVE = 'bg-card text-muted-foreground shadow-sm dark:bg-muted';

/**
 * Balancete é sempre de um único dia.
 */
export default function BalanceteDiaFiltros({
  dia,
  onDia,
  contas = [],
  contasSel = [],
  onContasSel,
}) {
  const hoje = dataHoje();
  const contasOrdenadas = ordenarContasCorteDiario(contas.filter((c) => c.ativo !== false));

  const toggleConta = (id) => {
    onContasSel(
      contasSel.includes(id) ? contasSel.filter((item) => item !== id) : [...contasSel, id],
    );
  };

  const ontem = (() => {
    const d = new Date(`${hoje}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] bg-muted/40 p-3 dark:bg-muted/60">
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span className="text-[11px] uppercase tracking-wide">Dia do corte</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDia(hoje)}
            className={`flex-1 rounded-full px-2 py-2 text-xs font-medium ${dia === hoje ? CHIP_ACTIVE : CHIP_INACTIVE}`}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => onDia(ontem)}
            className={`flex-1 rounded-full px-2 py-2 text-xs font-medium ${dia === ontem ? CHIP_ACTIVE : CHIP_INACTIVE}`}
          >
            Ontem
          </button>
        </div>
        <label className="mt-2 block">
          <span className="mb-1 block text-[10px] text-muted-foreground">Outra data</span>
          <input
            type="date"
            value={dia}
            onChange={(e) => onDia(e.target.value)}
            className="w-full rounded-xl border-0 bg-card px-2 py-2 text-xs shadow-sm dark:bg-card"
          />
        </label>
      </div>

      <div className="rounded-[24px] bg-muted/40 p-3 dark:bg-muted/60">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Contas no mapa
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
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
