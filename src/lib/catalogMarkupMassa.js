import { roundToTwoDecimals } from '@/lib/financialUtils';
import { getCatalogoComercialView, resolveCustoTotalUnitBaseProduto } from '@/lib/productUnits';
import { calcMarkup } from '@/components/produtos/treegrid/catalogTreeCore';

export function calcPrecoVendaFromMarkup(custoBase, markupPct) {
  const custo = Number(custoBase);
  const markup = Number(markupPct);
  if (!Number.isFinite(custo) || custo <= 0) return null;
  if (!Number.isFinite(markup)) return null;
  return roundToTwoDecimals(custo * (1 + markup / 100));
}

/**
 * Calcula patch de preço para aplicar um markup alvo sobre o custo na unidade base.
 */
export function buildMarkupMassaUpdate(produto, markupPct, { somenteSeDiferente = true } = {}) {
  if (!produto?.id) {
    return { ok: false, reason: 'invalido', produto };
  }

  const custoBase = resolveCustoTotalUnitBaseProduto(produto);
  if (custoBase <= 0) {
    return { ok: false, reason: 'sem_custo', produto };
  }

  const markupAlvo = roundToTwoDecimals(markupPct);
  const novoPreco = calcPrecoVendaFromMarkup(custoBase, markupAlvo);
  if (novoPreco === null) {
    return { ok: false, reason: 'sem_custo', produto };
  }

  const markupAtual = roundToTwoDecimals(calcMarkup(produto));
  const precoAtual = roundToTwoDecimals(produto.preco_venda_padrao || 0);
  const cat = getCatalogoComercialView(produto);

  if (
    somenteSeDiferente &&
    Math.abs(novoPreco - precoAtual) < 0.005 &&
    Math.abs(markupAtual - markupAlvo) < 0.05
  ) {
    return { ok: false, reason: 'sem_alteracao', produto, markupAtual, precoAtual };
  }

  return {
    ok: true,
    produto,
    patch: {
      preco_venda_padrao: novoPreco,
      preco_venda_percentual: markupAlvo,
      preco_venda_tipo: 'percentual',
    },
    preview: {
      id: produto.id,
      nome: produto.nome || produto.codigo_interno || produto.id,
      codigo: produto.codigo_interno || '',
      custoBase: roundToTwoDecimals(custoBase),
      precoAtual,
      precoNovo: novoPreco,
      markupAtual,
      markupNovo: markupAlvo,
      precoExibicaoAtual: roundToTwoDecimals(cat.precoVenda),
      precoExibicaoNovo: roundToTwoDecimals(
        custoBase > 0 ? novoPreco * (cat.custoNaEmbalagem / custoBase) : novoPreco,
      ),
      unidadeExibicao: cat.sigla || produto.unidade_principal || 'UN',
    },
  };
}

export function planMarkupMassaUpdates(produtos, markupPct, options = {}) {
  const lista = Array.isArray(produtos) ? produtos : [];
  const updates = [];
  const skipped = { sem_custo: 0, sem_alteracao: 0, invalido: 0 };

  for (const produto of lista) {
    const result = buildMarkupMassaUpdate(produto, markupPct, options);
    if (result.ok) {
      updates.push(result);
    } else if (result.reason && skipped[result.reason] !== undefined) {
      skipped[result.reason] += 1;
    }
  }

  return { updates, skipped, total: lista.length };
}
