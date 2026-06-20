import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CorteDiarioContaT from './CorteDiarioContaT';
import CorteDiarioSeta, { CorteDiarioArcos } from './CorteDiarioSeta';

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

function buildTransferencias(contas) {
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
        origemNome: origem.contaNome,
        destinoNome: destino.contaNome,
        valor: saida.valor,
      });
    });
  });
  return links;
}

function agregarPorPar(links) {
  const map = new Map();
  links.forEach((link) => {
    const key = `${link.origemId}→${link.destinoId}`;
    const prev = map.get(key) || { ...link, valor: 0 };
    prev.valor = Math.round((prev.valor + link.valor) * 100) / 100;
    map.set(key, prev);
  });
  return map;
}

export default function CorteDiarioPainel({ mapa }) {
  const { contas = [], previstos = [], dataInicio, dataFim } = mapa || {};

  const transferencias = useMemo(() => buildTransferencias(contas), [contas]);
  const porPar = useMemo(() => agregarPorPar(transferencias), [transferencias]);

  const transferenciasArco = useMemo(
    () => transferencias.filter((link) => {
      const oi = contas.findIndex((c) => c.contaId === link.origemId);
      const di = contas.findIndex((c) => c.contaId === link.destinoId);
      return di > oi + 1;
    }),
    [transferencias, contas],
  );

  const somaPar = (origemId, destinoId) =>
    porPar.get(`${origemId}→${destinoId}`)?.valor || 0;

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
          Balancete diário
        </p>
        <p className="mt-1 font-glacial text-lg font-semibold text-foreground">
          {formatPeriodoLabel(dataInicio, dataFim)}
        </p>
      </div>

      {/* Mapa relacional com setas — PDV → Geral → Bancos */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          <CorteDiarioArcos contas={contas} links={transferenciasArco} />

          <div className="flex items-stretch">
            {contas.map((conta, index) => {
              const proxima = contas[index + 1];
              const valorSeta = proxima ? somaPar(conta.contaId, proxima.contaId) : 0;

              return (
                <React.Fragment key={conta.contaId}>
                  <div className="w-[18rem] shrink-0">
                    <CorteDiarioContaT conta={conta} />
                  </div>
                  {proxima && (
                    <CorteDiarioSeta valor={valorSeta} ativa={valorSeta > 0} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {transferencias.length > 0 && (
        <div className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Fluxo entre contas
          </p>
          <ul className="space-y-1">
            {Array.from(porPar.values()).map((link) => (
              <li key={`${link.origemId}-${link.destinoId}`} className="text-[11px] text-foreground/85">
                <span className="font-medium">{link.origemNome}</span>
                <span className="mx-1.5 text-primary">→</span>
                <span className="font-medium">{link.destinoNome}</span>
                <span className="ml-2 tabular-nums text-muted-foreground">
                  R$ {formatValor(link.valor)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
