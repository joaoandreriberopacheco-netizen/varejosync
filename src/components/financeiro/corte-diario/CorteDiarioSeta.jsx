import React from 'react';
import { ArrowRight } from 'lucide-react';

function formatValor(valor) {
  return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Seta horizontal entre dois palitos consecutivos. */
export default function CorteDiarioSeta({ valor = 0, ativa = false, compact = false }) {
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center self-center ${
        compact ? 'min-w-[1.25rem] max-w-[1.75rem] px-0' : 'min-w-[3.25rem] max-w-[4.5rem] px-1'
      } ${ativa ? 'opacity-100' : 'opacity-35'}`}
      aria-hidden={!ativa}
    >
      {ativa && valor > 0 ? (
        <span
          className={`mb-0.5 text-center font-semibold tabular-nums leading-tight text-primary dark:text-[#a4ce33] ${
            compact ? 'text-[6px]' : 'text-[9px]'
          }`}
        >
          {compact ? formatValor(valor) : `R$ ${formatValor(valor)}`}
        </span>
      ) : (
        <span className={compact ? 'mb-0 h-2' : 'mb-1 h-3'} />
      )}
      <div className="flex w-full items-center">
        <div
          className={`h-0.5 flex-1 rounded-full ${
            ativa ? 'bg-primary dark:bg-[#a4ce33]' : 'border-t border-dashed border-muted-foreground/50 bg-transparent'
          }`}
        />
        <ArrowRight
          className={`shrink-0 -ml-0.5 ${
            compact ? 'h-2.5 w-2.5' : 'h-4 w-4'
          } ${ativa ? 'text-primary dark:text-[#a4ce33]' : 'text-muted-foreground/50'}`}
          strokeWidth={ativa ? 2.5 : 1.5}
        />
      </div>
    </div>
  );
}

/** Arcos SVG para transferências que saltam contas. */
export function CorteDiarioArcos({ contas = [], links = [], cardWidth = 288, arrowWidth = 52, compact = false }) {
  if (!links.length || contas.length < 3) return null;

  const cw = compact ? Math.min(cardWidth, 140) : cardWidth;
  const aw = compact ? Math.min(arrowWidth, 28) : arrowWidth;
  const step = cw + aw;
  const totalWidth = contas.length * step - aw;
  const indexById = Object.fromEntries(contas.map((c, i) => [c.contaId, i]));
  const svgHeight = compact ? 32 : 48;

  return (
    <svg
      className="pointer-events-none mb-0.5 w-full text-primary dark:text-[#a4ce33]"
      viewBox={`0 0 ${totalWidth} ${svgHeight}`}
      preserveAspectRatio="xMinYMin meet"
      style={{ height: svgHeight, minWidth: totalWidth }}
      aria-hidden
    >
      <defs>
        <marker
          id="corte-seta-ponta"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
        </marker>
      </defs>
      {links.map((link) => {
        const oi = indexById[link.origemId];
        const di = indexById[link.destinoId];
        if (oi == null || di == null || di <= oi + 1) return null;

        const x1 = oi * step + cw;
        const x2 = di * step;
        const yBase = compact ? 26 : 38;
        const arch = Math.min(compact ? 18 : 28, (compact ? 8 : 12) + (di - oi) * (compact ? 4 : 6));

        return (
          <g key={link.id}>
            <path
              d={`M ${x1} ${yBase} C ${x1 + (x2 - x1) * 0.25} ${yBase - arch}, ${x1 + (x2 - x1) * 0.75} ${yBase - arch}, ${x2} ${yBase}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={compact ? 1.5 : 2}
              markerEnd="url(#corte-seta-ponta)"
              opacity="0.85"
            />
            <text
              x={(x1 + x2) / 2}
              y={yBase - arch - 2}
              textAnchor="middle"
              className="fill-current font-semibold"
              style={{ fontSize: compact ? 7 : 9 }}
            >
              {`R$ ${formatValor(link.valor)}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
