import React from 'react';
import { ArrowRight } from 'lucide-react';

function formatValor(valor) {
  return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function LinhaMovimento({ descricao, valor, lado }) {
  const isEntrada = lado === 'entrada';
  return (
    <div className="py-1.5 text-[11px] leading-snug">
      <p className="break-words text-foreground/90">{descricao}</p>
      <p
        className={`mt-0.5 font-semibold tabular-nums ${
          isEntrada
            ? 'text-emerald-800 dark:text-emerald-400'
            : 'text-rose-800 dark:text-rose-400'
        }`}
      >
        {isEntrada ? '+' : '−'} R$ {formatValor(valor)}
      </p>
    </div>
  );
}

function ColunaLado({ titulo, items, lado, vazio }) {
  return (
    <div className="min-h-[9rem] flex-1 px-3 py-3">
      <p
        className={`mb-2 border-b pb-1 text-[10px] font-bold uppercase tracking-wider ${
          lado === 'entrada'
            ? 'border-emerald-500/30 text-emerald-800/80 dark:text-emerald-400/90'
            : 'border-rose-500/30 text-rose-800/80 dark:text-rose-400/90'
        }`}
      >
        {titulo}
      </p>
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-[11px] italic text-muted-foreground/80">{vazio}</p>
        ) : (
          items.map((item) => (
            <LinhaMovimento
              key={item.id}
              descricao={
                item.isTransferencia ? (
                  <span className="inline-flex items-start gap-1">
                    <span>{item.descricao}</span>
                    <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 opacity-50" />
                  </span>
                ) : (
                  item.descricao
                )
              }
              valor={item.valor}
              lado={lado}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Palito em T — como o desenho no papel: título, saldo inicial, T com entradas/saídas, saldo final.
 */
export default function CorteDiarioContaT({ conta }) {
  if (!conta) return null;

  return (
    <article className="flex h-full min-w-[18rem] max-w-[24rem] flex-1 flex-col overflow-hidden rounded-xl border-2 border-border/60 bg-[#faf9f6] shadow-md dark:border-border/50 dark:bg-card">
      {/* Título */}
      <header className="border-b-2 border-border/50 bg-[#f0efe8] px-3 py-2.5 text-center dark:bg-muted/40">
        <h3 className="font-glacial text-sm font-bold uppercase tracking-wide text-foreground">
          {conta.contaNome}
        </h3>
        {conta.isCaixaPDV && (
          <p className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
            Só dinheiro na gaveta
          </p>
        )}
        {conta.isCaixaGeral && (
          <p className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
            Central
          </p>
        )}
      </header>

      {/* Saldo inicial — barra horizontal do T */}
      <div className="border-b border-border/40 bg-white/60 px-3 py-2 text-center dark:bg-muted/20">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          Saldo inicial
        </p>
        <p className="text-sm font-bold tabular-nums text-foreground">
          R$ {formatValor(conta.saldoInicial)}
        </p>
      </div>

      {/* Hastes do T: entradas | saídas */}
      <div className="relative flex min-h-[11rem] flex-1 divide-x-2 divide-border/50">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-border/60"
          aria-hidden
        />
        <ColunaLado titulo="Entradas" items={conta.entradas} lado="entrada" vazio="—" />
        <ColunaLado titulo="Saídas" items={conta.saidas} lado="saida" vazio="—" />
      </div>

      {/* Saldo final */}
      <footer className="border-t-2 border-emerald-600/40 bg-emerald-50 px-3 py-2.5 text-center dark:border-emerald-500/35 dark:bg-emerald-950/30">
        <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-900/70 dark:text-emerald-300/80">
          Saldo final
        </p>
        <p className="text-base font-bold tabular-nums text-emerald-900 dark:text-emerald-300">
          R$ {formatValor(conta.saldoFinal)}
        </p>
      </footer>
    </article>
  );
}
