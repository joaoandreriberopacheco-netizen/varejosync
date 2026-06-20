import React from 'react';
import { ArrowRight } from 'lucide-react';

function formatValor(valor) {
  return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Seta horizontal entre dois palitos consecutivos (estilo diagrama). */
export default function CorteDiarioSeta({ valor = 0, ativa = false }) {
  return (
    <div
      className={`flex min-w-[3.25rem] max-w-[4.5rem] flex-col items-center justify-center self-center px-1 ${
        ativa ? 'opacity-100' : 'opacity-35'
      }`}
      aria-hidden={!ativa}
    >
      {ativa && valor > 0 ? (
        <span className="mb-1 text-center text-[9px] font-semibold tabular-nums leading-tight text-primary dark:text-[#a4ce33]">
          R$ {formatValor(valor)}
        </span>
      ) : (
        <span className="mb-1 h-3" />
      )}
      <div className="flex w-full items-center">
        <div
          className={`h-0.5 flex-1 rounded-full ${
            ativa ? 'bg-primary dark:bg-[#a4ce33]' : 'border-t border-dashed border-muted-foreground/50 bg-transparent'
          }`}
        />
        <ArrowRight
          className={`h-4 w-4 shrink-0 -ml-0.5 ${
            ativa ? 'text-primary dark:text-[#a4ce33]' : 'text-muted-foreground/50'
          }`}
          strokeWidth={ativa ? 2.5 : 1.5}
        />
      </div>
    </div>
  );
}

/** Arcos SVG para transferências que saltam contas (ex.: Geral → Poupança com Banco no meio). */
export function CorteDiarioArcos({ contas = [], links = [], cardWidth = 288, arrowWidth = 52 }) {
  if (!links.length || contas.length < 3) return null;

  const step = cardWidth + arrowWidth;
  const totalWidth = contas.length * step - arrowWidth;
  const indexById = Object.fromEntries(contas.map((c, i) => [c.contaId, i]));

  return (
    <svg
      className="pointer-events-none mb-1 w-full text-primary dark:text-[#a4ce33]"
      viewBox={`0 0 ${totalWidth} 48`}
      preserveAspectRatio="xMinYMin meet"
      style={{ height: 48, minWidth: totalWidth }}
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

        const x1 = oi * step + cardWidth;
        const x2 = di * step;
        const yBase = 38;
        const arch = Math.min(28, 12 + (di - oi) * 6);

        return (
          <g key={link.id}>
            <path
              d={`M ${x1} ${yBase} C ${x1 + (x2 - x1) * 0.25} ${yBase - arch}, ${x1 + (x2 - x1) * 0.75} ${yBase - arch}, ${x2} ${yBase}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="none"
              markerEnd="url(#corte-seta-ponta)"
              opacity="0.85"
            />
            <text
              x={(x1 + x2) / 2}
              y={yBase - arch - 4}
              textAnchor="middle"
              className="fill-current text-[9px] font-semibold"
              style={{ fontSize: 9 }}
            >
              {`R$ ${formatValor(link.valor)}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
