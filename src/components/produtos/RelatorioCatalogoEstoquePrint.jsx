import React, { useMemo } from 'react';
import {
  buildTree,
  flattenTree,
  mergeAdjacentDuplicateGroupHeaders,
  buildExpandedForLevel,
  calcCusto,
} from '@/components/produtos/treegrid/useTreeGrid';
import { formatEstoqueApresentacao, getCatalogoComercialView } from '@/lib/productUnits';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import './relatorioCatalogoEstoquePrint.css';

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

function printPreco(valor) {
  if (!(valor > 0)) return '—';
  return fmtR(valor);
}

function TreeIndent({ level }) {
  if (!level || level <= 1) return null;
  return (
    <>
      {Array.from({ length: level - 1 }, (_, i) => (
        <span key={i} className="rce-tree-indent" aria-hidden="true" />
      ))}
    </>
  );
}

function ProdutoNome({ nome, codigo }) {
  return (
    <>
      <span className="rce-nome">{nome || '—'}</span>
      {codigo ? <span className="rce-print-codigo">{codigo}</span> : null}
    </>
  );
}

function PrintTableHeader({ firstColLabel }) {
  return (
    <thead>
      <tr>
        <th className="col-produto">{firstColLabel}</th>
        <th className="col-num col-estoque">Estoque</th>
        <th className="col-num col-money">Vl. compra</th>
        <th className="col-num col-money">Custo</th>
        <th className="col-num col-money">Venda</th>
        <th className="col-num col-money">Invent. R$</th>
      </tr>
    </thead>
  );
}

function EmptyBody() {
  return (
    <tbody>
      <tr>
        <td colSpan={6} style={{ textAlign: 'center', padding: '12px 4px', color: '#484848' }}>
          Nenhum produto encontrado.
        </td>
      </tr>
    </tbody>
  );
}

function PlanaPrintBody({ produtos }) {
  if (!produtos?.length) return <EmptyBody />;

  return (
    <tbody>
      {produtos.map((p) => {
        const cat = getCatalogoComercialView(p);
        const lastro = calcCusto(p) * (p.estoque_atual || 0);
        return (
          <tr key={p.id} className="rce-print-row-produto">
            <td>
              <ProdutoNome nome={p.nome} codigo={p.codigo_interno} />
            </td>
            <td className="col-num">{printEstoqueCell(p)}</td>
            <td className="col-num">{printPreco(cat.valorCompraNaEmbalagem)}</td>
            <td className="col-num">{printPreco(cat.custoNaEmbalagem)}</td>
            <td className="col-num">{printPreco(cat.precoVenda)}</td>
            <td className="col-num">{lastro > 0 ? fmtR(lastro) : '—'}</td>
          </tr>
        );
      })}
    </tbody>
  );
}

function TreePrintBody({ rows }) {
  if (!rows.length) return <EmptyBody />;

  return (
    <tbody>
      {rows.map((row) => {
        if (row.type === 'group') {
          return (
            <tr key={row.key} className="rce-print-row-group">
              <td>
                <TreeIndent level={row.level} />
                {row.label}
                <span style={{ fontWeight: 400, color: '#484848', marginLeft: 3 }}>({row.count})</span>
              </td>
              <td className="col-num">{printGroupEstoque(row)}</td>
              <td className="col-num">{row.valorCompraMedio > 0 ? `~${fmtR(row.valorCompraMedio)}` : '—'}</td>
              <td className="col-num">{row.custoMedio > 0 ? `~${fmtR(row.custoMedio)}` : '—'}</td>
              <td className="col-num">{row.precoMedio > 0 ? `~${fmtR(row.precoMedio)}` : '—'}</td>
              <td className="col-num">{row.lastroTotal > 0 ? fmtR(row.lastroTotal) : '—'}</td>
            </tr>
          );
        }

        const p = row.produto;
        const cat = getCatalogoComercialView(p);
        const level = row.level ?? 1;
        return (
          <tr key={row.key} className="rce-print-row-produto">
            <td>
              <TreeIndent level={level} />
              <ProdutoNome nome={p.nome} codigo={p.codigo_interno} />
            </td>
            <td className="col-num">{printEstoqueCell(p)}</td>
            <td className="col-num">{printPreco(cat.valorCompraNaEmbalagem)}</td>
            <td className="col-num">{printPreco(cat.custoNaEmbalagem)}</td>
            <td className="col-num">{printPreco(cat.precoVenda)}</td>
            <td className="col-num">{row.lastro > 0 ? fmtR(row.lastro) : '—'}</td>
          </tr>
        );
      })}
    </tbody>
  );
}

function PrintFooter({ totals }) {
  return (
    <footer className="rce-print-footer">
      <p style={{ margin: 0, maxWidth: '22rem', color: '#484848' }}>
        Totais dos SKUs filtrados: estoque × valor de compra, custo total ou preço de venda.
      </p>
      <div className="rce-print-footer-totals">
        {[
          ['Inventário (vl. compra)', totals.totalCompra],
          ['Inventário (custo)', totals.totalCusto],
          ['Inventário (venda)', totals.totalVenda],
        ].map(([label, value]) => (
          <div key={label}>
            <span style={{ color: '#484848', textTransform: 'uppercase', fontSize: '6.5pt' }}>{label}</span>
            <div className="rce-total-value">R$ {fmtR(roundToTwoDecimals(value))}</div>
          </div>
        ))}
      </div>
    </footer>
  );
}

/**
 * Layout só para impressão — diagramação enxuta preto e branco, grade com linhas verticais.
 */
export default function RelatorioCatalogoEstoquePrint({
  produtos,
  filtersSummary,
  totals,
  generatedAt,
  layoutMode = 'tree',
}) {
  const isPlana = layoutMode === 'plana';
  const rows = useMemo(() => {
    if (isPlana) return [];
    const tree = buildTree(produtos || []);
    const expanded = buildExpandedForLevel(tree, 98);
    return mergeAdjacentDuplicateGroupHeaders(flattenTree(tree, expanded));
  }, [produtos, isPlana]);

  const skuCount = produtos?.length ?? 0;

  return (
    <div id="relatorio-catalogo-estoque-print" aria-hidden="true">
      <header className="rce-print-header">
        <h1 className="rce-print-title">Relatório de estoque</h1>
        <p className="rce-print-meta">
          {isPlana ? 'Lista plana' : 'Hierarquia'} · {skuCount} SKU(s) · Emitido em {generatedAt}
        </p>
        {filtersSummary ? (
          <p className="rce-print-meta">
            <strong>Filtros:</strong> {filtersSummary}
          </p>
        ) : null}
        <div className="rce-print-kpis">
          <span>
            <strong>Invent. compra:</strong> R$ {fmtR(roundToTwoDecimals(totals.totalCompra))}
          </span>
          <span>
            <strong>Invent. custo:</strong> R$ {fmtR(roundToTwoDecimals(totals.totalCusto))}
          </span>
          <span>
            <strong>Invent. venda:</strong> R$ {fmtR(roundToTwoDecimals(totals.totalVenda))}
          </span>
        </div>
      </header>

      <table className="rce-print-table">
        <PrintTableHeader firstColLabel={isPlana ? 'Produto' : 'Produto / grupo'} />
        {isPlana ? <PlanaPrintBody produtos={produtos} /> : <TreePrintBody rows={rows} />}
      </table>

      <PrintFooter totals={totals} />
    </div>
  );
}
