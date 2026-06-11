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

const PRINT_TIER = {
  pai: {
    bg: '#5c5c5c',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
  solteiro: {
    bg: '#5c5c5c',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
  filho: {
    bg: '#ffffff',
    text: '#1a1a1a',
    muted: '#4b5563',
  },
};

/** `pai` = grupo; `solteiro` = produto nível 1; `filho` = produto em grupo. */
function getPrintRowTier(row) {
  if (row.type === 'group') return 'pai';
  return (row.level ?? 1) <= 1 ? 'solteiro' : 'filho';
}

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

function printPreco(valor) {
  if (!(valor > 0)) return '—';
  return `R$ ${fmtR(valor)}`;
}

function printRowCells(style, cells, { firstCellPaddingLeft } = {}) {
  return cells.map((content, index) => (
    <td
      key={index}
      className="tabular-nums"
      style={{
        ...style,
        textAlign: index === 0 ? 'left' : 'right',
        padding: '4px 6px',
        paddingLeft: index === 0 && firstCellPaddingLeft != null ? firstCellPaddingLeft : undefined,
        verticalAlign: 'middle',
        borderBottom: '1px solid #d1d5db',
      }}
    >
      {content}
    </td>
  ));
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

  const headerCellStyle = {
    textAlign: 'left',
    padding: '6px 6px',
    fontSize: '11pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    color: '#111111',
    borderBottom: '2px solid #374151',
    backgroundColor: '#f3f4f6',
  };

  return (
    <div
      id="relatorio-catalogo-estoque-print"
      className="hidden print:block"
      style={{
        fontSize: '12pt',
        lineHeight: 1.35,
        color: '#111111',
        backgroundColor: '#ffffff',
      }}
      aria-hidden="true"
    >
      <header style={{ marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #d1d5db' }}>
        <h1 style={{ fontSize: '14pt', fontWeight: 700, margin: 0, color: '#111111' }}>
          Relatório de estoque
        </h1>
        <p style={{ fontSize: '11pt', color: '#4b5563', margin: '4px 0 0' }}>
          Hierarquia do catálogo · {produtos?.length ?? 0} SKU(s) filtrado(s)
        </p>
        <p style={{ fontSize: '11pt', color: '#4b5563', margin: '2px 0 0' }}>
          Emitido em {generatedAt}
        </p>
        {filtersSummary ? (
          <p style={{ fontSize: '11pt', color: '#1f2937', margin: '8px 0 0' }}>
            <span style={{ fontWeight: 600 }}>Filtros:</span> {filtersSummary}
          </p>
        ) : null}
      </header>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: '34%' }}>Produto / grupo</th>
            <th style={{ ...headerCellStyle, textAlign: 'right' }}>Estoque</th>
            <th style={{ ...headerCellStyle, textAlign: 'right' }}>Vl. compra</th>
            <th style={{ ...headerCellStyle, textAlign: 'right' }}>Custo total</th>
            <th style={{ ...headerCellStyle, textAlign: 'right' }}>Preço venda</th>
            <th style={{ ...headerCellStyle, textAlign: 'right' }}>Inventário R$</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '32px 6px', textAlign: 'center', color: '#6b7280' }}>
                Nenhum produto encontrado.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const tier = getPrintRowTier(row);
              const palette = PRINT_TIER[tier];
              const cellStyle = {
                backgroundColor: palette.bg,
                color: palette.text,
                fontWeight: tier === 'filho' ? 400 : 600,
              };

              if (row.type === 'group') {
                const indent = (row.level - 1) * 12;
                return (
                  <tr key={row.key}>
                    {printRowCells(
                      cellStyle,
                      [
                        <>
                          {row.label}
                          <span style={{ fontWeight: 400, color: palette.muted, marginLeft: 4 }}>
                            ({row.count})
                          </span>
                        </>,
                        printGroupEstoque(row),
                        row.valorCompraMedio > 0 ? `~${fmtR(row.valorCompraMedio)}` : '—',
                        row.custoMedio > 0 ? `~${fmtR(row.custoMedio)}` : '—',
                        row.precoMedio > 0 ? `~${fmtR(row.precoMedio)}` : '—',
                        row.lastroTotal > 0 ? fmtR(row.lastroTotal) : '—',
                      ],
                      { firstCellPaddingLeft: 6 + indent },
                    )}
                  </tr>
                );
              }

              const p = row.produto;
              const cat = getCatalogoComercialView(p);
              const indent = tier === 'filho' ? 8 + (row.level - 1) * 12 : 6;
              return (
                <tr key={row.key}>
                  {printRowCells(
                    cellStyle,
                    [
                      <>
                        <span style={{ textTransform: 'uppercase' }}>{p.nome || '—'}</span>
                        {p.codigo_interno ? (
                          <span
                            style={{
                              marginLeft: 4,
                              fontFamily: 'monospace',
                              fontSize: '10pt',
                              color: palette.muted,
                            }}
                          >
                            {p.codigo_interno}
                          </span>
                        ) : null}
                      </>,
                      printEstoqueCell(p),
                      printPreco(cat.valorCompraNaEmbalagem),
                      printPreco(cat.custoNaEmbalagem),
                      printPreco(cat.precoVenda),
                      row.lastro > 0 ? fmtR(row.lastro) : '—',
                    ],
                    { firstCellPaddingLeft: indent },
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <footer
        style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #d1d5db',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <p style={{ fontSize: '10pt', color: '#6b7280', maxWidth: '20rem', margin: 0 }}>
          Totais dos SKUs filtrados: estoque (vitrine quando activa) × valor de compra, custo total ou preço de venda.
        </p>
        <div style={{ textAlign: 'right' }}>
          {[
            ['Inventário (valor de compra)', totals.totalCompra],
            ['Inventário (custo total)', totals.totalCusto],
            ['Inventário (preço de venda)', totals.totalVenda],
          ].map(([label, value]) => (
            <div key={label} style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '10pt', color: '#6b7280', textTransform: 'uppercase' }}>
                {label}
              </span>
              <div style={{ fontSize: '12pt', fontWeight: 700, color: '#111111' }} className="tabular-nums">
                R$ {fmtR(roundToTwoDecimals(value))}
              </div>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
