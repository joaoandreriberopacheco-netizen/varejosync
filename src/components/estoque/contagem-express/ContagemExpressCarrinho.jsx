import {
  ArrowLeft, Loader2, Minus, Package, Send, TrendingDown, TrendingUp,
} from 'lucide-react';
import { formatCountQuantity, getGroupDisplayFromBase } from '@/lib/inventoryCountUnits';

function DiffBadge({ diferenca, unidade }) {
  if (diferenca === null || Math.abs(diferenca) < 1e-6) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
        OK
      </span>
    );
  }

  const positivo = diferenca > 0;
  const Icon = positivo ? TrendingUp : TrendingDown;
  const tone = positivo
    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
    : 'text-red-600 dark:text-red-400 bg-red-500/10';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      <Icon className="h-3 w-3" />
      {positivo ? '+' : ''}{formatCountQuantity(diferenca)} {unidade || 'UN'}
    </span>
  );
}

export default function ContagemExpressCarrinho({
  itensAgrupados,
  comparativo,
  loadingComparativo,
  finalizando,
  onVoltar,
  onLancar,
}) {
  const mapaComparativo = Object.fromEntries((comparativo || []).map((r) => [r.produto_id, r]));

  const totais = (comparativo || []).reduce(
    (acc, row) => {
      if (!row.temDiferenca) {
        acc.ok += 1;
        return acc;
      }
      if (row.diferenca > 0) acc.sobras += 1;
      else acc.faltas += 1;
      return acc;
    },
    { ok: 0, sobras: 0, faltas: 0 }
  );

  const comAjuste = totais.sobras + totais.faltas;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
        <button
          type="button"
          onClick={onVoltar}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold font-glacial text-foreground">Carrinho</h2>
      </div>

      {!loadingComparativo && comparativo?.length > 0 && (
        <div className="grid grid-cols-3 gap-2 border-b border-border/40 px-4 py-3">
          <div className="rounded-xl bg-green-500/10 px-2 py-2 text-center">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{totais.ok}</div>
            <div className="text-[10px] text-muted-foreground">Conferem</div>
          </div>
          <div className="rounded-xl bg-amber-500/10 px-2 py-2 text-center">
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{totais.sobras}</div>
            <div className="text-[10px] text-muted-foreground">Sobras</div>
          </div>
          <div className="rounded-xl bg-red-500/10 px-2 py-2 text-center">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">{totais.faltas}</div>
            <div className="text-[10px] text-muted-foreground">Faltas</div>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3 pb-28">
        {itensAgrupados.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">Carrinho vazio</div>
        )}

        {itensAgrupados.map((grupo) => {
          const row = mapaComparativo[grupo.produto_id];
          const produto = grupo._produto;
          const display = grupo.display;
          const sistemaDisplay = row && produto
            ? getGroupDisplayFromBase(produto, row.saldoExtrato)
            : null;
          const diffDisplay = row && produto && row.temDiferenca
            ? getGroupDisplayFromBase(produto, Math.abs(row.diferenca))
            : null;

          return (
            <div key={grupo.produto_id} className="rounded-2xl bg-muted/40 p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card shadow-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{grupo.produto_nome}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-card/80 px-2 py-1.5">
                      <div className="text-muted-foreground">Sistema</div>
                      <div className="font-semibold text-foreground">
                        {loadingComparativo || !sistemaDisplay
                          ? '…'
                          : `${formatCountQuantity(sistemaDisplay.quantidade)} ${sistemaDisplay.unidade}`}
                      </div>
                    </div>
                    <div className="rounded-lg bg-card/80 px-2 py-1.5">
                      <div className="text-muted-foreground">Contado</div>
                      <div className="font-semibold text-foreground">
                        {formatCountQuantity(display?.quantidade ?? grupo.totalBase)}{' '}
                        {display?.unidade || 'UN'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    {loadingComparativo ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <DiffBadge
                        diferenca={row?.diferenca ?? null}
                        unidade={diffDisplay?.unidade || display?.unidade}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border/40 bg-card p-4 dark:bg-background">
        <button
          type="button"
          onClick={onLancar}
          disabled={finalizando || itensAgrupados.length === 0 || loadingComparativo}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-white shadow-lg transition-transform active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
        >
          {finalizando ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Send className="h-5 w-5" />
              Lançar ajustes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
