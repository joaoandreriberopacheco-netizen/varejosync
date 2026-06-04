import React, { useMemo } from 'react';
import {
  buildTree,
  flattenTree,
  mergeAdjacentDuplicateGroupHeaders,
  buildExpandedForLevel,
} from '@/components/produtos/treegrid/useTreeGrid';
import { formatEstoqueApresentacao, getCatalogoComercialView } from '@/lib/productUnits';
import { roundToTwoDecimals } from '@/lib/financialUtils';

const fmtR = (n) =>
  (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function printEstoqueCell(produto) {
  const apresent = formatEstoqueApresentacao(produto);
  const qtd = apresent ? apresent.quantidade : produto.estoque_atual;
  const un = apresent ? apresent.sigla : produto.unidade_principal || 'UN';
  return `${fmtN(qtd)} ${un}`;
}

function printGroupEstoque(row) {
  if (row.estoqueTotal != null && row.estoqueTotal > 0) {
    return fmtN(row.estoqueTotal);
  }
  return '—';
}

/**
 * Layout só para impressão — tabela clara em fundo branco, sem chrome da UI.
 */
export default function RelatorioCatalogoEstoquePrint({
  produtos,
  filtersSummary,
  totals,
  generatedAt,
}) {
  const rows = useMemo(() => {
    const tree = buildTree(produtos || []);
    const expanded = buildExpandedForLevel(tree, 98);
    return mergeAdjacentDuplicateGroupHeaders(flattenTree(tree, expanded));
  }, [produtos]);

  return (
    <div
      id="relatorio-catalogo-estoque-print"
      className="hidden print:block bg-white text-foreground text-[11px] leading-snug"
      aria-hidden="true"
    >
      <header className="mb-4 pb-3 border-b border-gray-300">
        <h1 className="text-lg font-bold text-foreground m-0">Relatório de estoque</h1>
        <p className="text-xs text-muted-foreground mt-1 mb-0">
          Hierarquia do catálogo · {produtos?.length ?? 0} SKU(s) filtrado(s)
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-0">
          Emitido em {generatedAt}
        </p>
        {filtersSummary ? (
          <p className="text-xs text-foreground/90 mt-2 mb-0">
            <span className="font-semibold">Filtros:</span> {filtersSummary}
          </p>
        ) : null}
      </header>

      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="border-b-2 border-gray-400">
            <th
              className="text-left py-1.5 pr-2 font-semibold uppercase tracking-wide text-[10px]"
              style={{ width: '42%' }}
            >
              Produto / grupo
            </th>
            <th className="text-right py-1.5 px-1 font-semibold uppercase tracking-wide text-[10px]">
              Estoque
            </th>
            <th className="text-right py-1.5 px-1 font-semibold uppercase tracking-wide text-[10px]">
              Vl. compra
            </th>
            <th className="text-right py-1.5 px-1 font-semibold uppercase tracking-wide text-[10px]">
              Custo total
            </th>
            <th className="text-right py-1.5 pl-1 font-semibold uppercase tracking-wide text-[10px]">
              Inventário R$
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-muted-foreground">
                Nenhum produto encontrado.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              if (row.type === 'group') {
                const indent = (row.level - 1) * 12;
                return (
                  <tr key={row.key} className="border-b border-border/40 bg-muted/40">
                    <td className="py-1 pr-2 font-semibold text-gray-800" style={{ paddingLeft: indent }}>
                      {row.label}
                      <span className="font-normal text-muted-foreground ml-1">({row.count})</span>
                    </td>
                    <td className="text-right py-1 px-1 tabular-nums">{printGroupEstoque(row)}</td>
                    <td className="text-right py-1 px-1 tabular-nums">
                      {row.valorCompraMedio > 0 ? `~${fmtR(row.valorCompraMedio)}` : '—'}
                    </td>
                    <td className="text-right py-1 px-1 tabular-nums">
                      {row.custoMedio > 0 ? `~${fmtR(row.custoMedio)}` : '—'}
                    </td>
                    <td className="text-right py-1 pl-1 tabular-nums font-medium">
                      {row.lastroTotal > 0 ? fmtR(row.lastroTotal) : '—'}
                    </td>
                  </tr>
                );
              }

              const p = row.produto;
              const cat = getCatalogoComercialView(p);
              const indent = 8 + (row.level - 1) * 12;
              return (
                <tr key={row.key} className="border-b border-border/40">
                  <td className="py-0.5 pr-2 text-foreground/90" style={{ paddingLeft: indent }}>
                    <span className="uppercase">{p.nome || '—'}</span>
                    {p.codigo_interno ? (
                      <span className="text-muted-foreground font-mono text-[10px] ml-1">{p.codigo_interno}</span>
                    ) : null}
                  </td>
                  <td className="text-right py-0.5 px-1 tabular-nums">{printEstoqueCell(p)}</td>
                  <td className="text-right py-0.5 px-1 tabular-nums">
                    {cat.valorCompraNaEmbalagem > 0 ? fmtR(cat.valorCompraNaEmbalagem) : '—'}
                  </td>
                  <td className="text-right py-0.5 px-1 tabular-nums">
                    {cat.custoNaEmbalagem > 0 ? fmtR(cat.custoNaEmbalagem) : '—'}
                  </td>
                  <td className="text-right py-0.5 pl-1 tabular-nums">
                    {row.lastro > 0 ? fmtR(row.lastro) : '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <footer className="mt-4 pt-3 border-t border-gray-300 flex flex-wrap justify-between gap-4">
        <p className="text-[10px] text-muted-foreground max-w-md m-0">
          Totais dos SKUs filtrados: estoque (vitrine quando activa) × valor de compra ou custo total.
        </p>
        <div className="text-right space-y-1">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground">Inventário (valor de compra)</span>
            <div className="text-base font-bold tabular-nums">R$ {fmtR(roundToTwoDecimals(totals.totalCompra))}</div>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground">Inventário (custo total)</span>
            <div className="text-base font-bold tabular-nums">R$ {fmtR(roundToTwoDecimals(totals.totalCusto))}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
