import React from 'react';
import { ArrowRight } from 'lucide-react';

function formatValor(valor) {
  return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function LinhaValor({ descricao, valor, tone = 'neutral' }) {
  const toneClass =
    tone === 'entrada'
      ? 'text-emerald-700 dark:text-emerald-400'
      : tone === 'saida'
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-foreground/90';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 py-1 text-xs leading-snug">
      <span className="text-foreground/85 break-words">{descricao}</span>
      <span className={`font-medium tabular-nums whitespace-nowrap ${toneClass}`}>
        {tone === 'entrada' ? '+' : tone === 'saida' ? '−' : ''}
        {formatValor(valor)}
      </span>
    </div>
  );
}

function ColunaMovimentos({ titulo, items, tone, vazio }) {
  return (
    <div className="min-h-[8rem] flex-1 px-3 py-2">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <div className="space-y-0.5">
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/80 italic">{vazio}</p>
        ) : (
          items.map((item) => (
            <LinhaValor
              key={item.id}
              descricao={
                item.isTransferencia ? (
                  <span className="inline-flex items-center gap-1">
                    {item.descricao}
                    <ArrowRight className="h-3 w-3 shrink-0 opacity-60" />
                  </span>
                ) : (
                  item.descricao
                )
              }
              valor={item.valor}
              tone={tone}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Palito em T: título, saldo inicial, entradas à esquerda, saídas à direita, saldo final.
 */
export default function CorteDiarioContaT({ conta, highlightTransferTo, highlightTransferFrom }) {
  if (!conta) return null;

  const hasHighlight =
    (highlightTransferTo && highlightTransferTo.length > 0) ||
    (highlightTransferFrom && highlightTransferFrom.length > 0);

  return (
    <article
      className={`flex min-w-[17rem] max-w-[22rem] flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow ${
        hasHighlight
          ? 'border-primary/35 ring-1 ring-primary/15'
          : 'border-border/50'
      }`}
    >
      <header className="border-b border-border/40 bg-muted/30 px-4 py-3 text-center">
        <h3 className="font-glacial text-sm font-semibold text-foreground">{conta.contaNome}</h3>
        {conta.isCaixaPDV && (
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Dinheiro na gaveta
          </p>
        )}
        {conta.isCaixaGeral && (
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Central de distribuição
          </p>
        )}
      </header>

      <div className="border-b border-border/30 bg-muted/15 px-4 py-2.5 text-center">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Saldo inicial</p>
        <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
          R$ {formatValor(conta.saldoInicial)}
        </p>
      </div>

      <div className="flex min-h-[10rem] divide-x divide-border/30">
        <ColunaMovimentos
          titulo="Entradas"
          items={conta.entradas}
          tone="entrada"
          vazio="Sem entradas"
        />
        <ColunaMovimentos
          titulo="Saídas"
          items={conta.saidas}
          tone="saida"
          vazio="Sem saídas"
        />
      </div>

      <footer className="mt-auto border-t border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-center dark:bg-emerald-500/10">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/80 dark:text-emerald-300/90">
          Saldo final
        </p>
        <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
          R$ {formatValor(conta.saldoFinal)}
        </p>
      </footer>
    </article>
  );
}
