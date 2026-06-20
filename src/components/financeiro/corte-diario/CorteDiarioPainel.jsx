import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CorteDiarioContaT from './CorteDiarioContaT';

function formatPeriodoLabel(dataInicio, dataFim) {
  if (!dataInicio && !dataFim) return 'Período completo';
  if (dataInicio === dataFim) {
    try {
      return format(parseISO(dataInicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dataInicio;
    }
  }
  return `${dataInicio} até ${dataFim}`;
}

function formatValor(valor) {
  return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CorteDiarioPainel({ mapa }) {
  const { contas = [], previstos = [], dataInicio, dataFim } = mapa || {};

  const transferencias = useMemo(() => {
    const links = [];
    contas.forEach((origem) => {
      origem.saidas?.forEach((saida) => {
        if (!saida.isTransferencia || !saida.transferenciaDestinoId) return;
        const destino = contas.find((c) => c.contaId === saida.transferenciaDestinoId);
        if (!destino) return;
        links.push({
          id: `${origem.contaId}-${saida.id}-${destino.contaId}`,
          origemId: origem.contaId,
          destinoId: destino.contaId,
          valor: saida.valor,
        });
      });
    });
    return links;
  }, [contas]);

  if (!contas.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Selecione pelo menos uma conta para gerar o mapa do corte diário.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/40 bg-muted/20 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Corte diário
        </p>
        <p className="mt-1 font-glacial text-lg font-semibold text-foreground">
          {formatPeriodoLabel(dataInicio, dataFim)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Mapa relacional do que já está líquido em cada conta. Vendas do PDV aparecem compactas;
          demais movimentos linha a linha.
        </p>
      </div>

      <div className="relative">
        {transferencias.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 px-1">
            {transferencias.map((link) => {
              const origem = contas.find((c) => c.contaId === link.origemId);
              const destino = contas.find((c) => c.contaId === link.destinoId);
              if (!origem || !destino) return null;
              return (
                <span
                  key={link.id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] text-foreground/85"
                >
                  {origem.contaNome} → {destino.contaNome}
                  <span className="font-medium tabular-nums">R$ {formatValor(link.valor)}</span>
                </span>
              );
            })}
          </div>
        )}

        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          {contas.map((conta) => (
            <div key={conta.contaId} className="snap-start shrink-0">
              <CorteDiarioContaT conta={conta} />
            </div>
          ))}
        </div>
      </div>

      {previstos.length > 0 && (
        <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 dark:bg-amber-500/8">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/90 dark:text-amber-300">
            A entrar / previsto
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Valores que ainda não estão líquidos no corte — não entram nos saldos finais acima.
          </p>
          <ul className="mt-3 space-y-2">
            {previstos.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-xs"
              >
                <span className="text-foreground/90">
                  {item.descricao}
                  {item.contaNome ? (
                    <span className="text-muted-foreground"> · {item.contaNome}</span>
                  ) : null}
                  {item.data ? (
                    <span className="text-muted-foreground"> · {item.data}</span>
                  ) : null}
                </span>
                <span className="font-medium tabular-nums text-amber-800 dark:text-amber-300">
                  R$ {formatValor(item.valor)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
