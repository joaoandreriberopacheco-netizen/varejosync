import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';
import CorteDiarioContaT from './CorteDiarioContaT';

function formatPeriodoLabel(dataInicio, dataFim) {
  if (!dataInicio && !dataFim) return 'Todo o período';
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
          origemNome: origem.contaNome,
          destinoNome: destino.contaNome,
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
          Nenhuma movimentação encontrada para o período e contas selecionados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/40 bg-muted/15 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Corte diário
        </p>
        <p className="mt-1 font-glacial text-lg font-semibold text-foreground">
          {formatPeriodoLabel(dataInicio, dataFim)}
        </p>
      </div>

      {transferencias.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {transferencias.map((link) => (
            <span
              key={link.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[11px] text-foreground/90"
            >
              {link.origemNome}
              <ArrowRight className="h-3 w-3 opacity-60" />
              {link.destinoNome}
              <span className="font-semibold tabular-nums">R$ {formatValor(link.valor)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Palitos lado a lado — PDV | Geral | Bancos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {contas.map((conta) => (
          <CorteDiarioContaT key={conta.contaId} conta={conta} />
        ))}
      </div>

      {previstos.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-50/80 px-4 py-3 dark:bg-amber-950/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-900/80 dark:text-amber-300">
            A entrar / previsto
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Não entra no saldo final do corte.
          </p>
          <ul className="mt-2 space-y-1.5">
            {previstos.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-[11px]"
              >
                <span className="text-foreground/90">
                  {item.descricao}
                  {item.contaNome ? (
                    <span className="text-muted-foreground"> · {item.contaNome}</span>
                  ) : null}
                </span>
                <span className="font-semibold tabular-nums text-amber-900 dark:text-amber-300">
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
