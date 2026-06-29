import { getCatalogoComercialView } from '@/lib/productUnits';
import { calcMarkup } from '@/lib/catalogProductCalc';

export const NUMERIC_COMPARISON_OPERATORS = [
  { value: 'all', label: 'Qualquer valor' },
  { value: 'gt', label: 'Maior que' },
  { value: 'gte', label: 'Maior ou igual a' },
  { value: 'lt', label: 'Menor que' },
  { value: 'lte', label: 'Menor ou igual a' },
  { value: 'between', label: 'Entre' },
];

export const NUMERIC_COMPARISON_LABELS = Object.fromEntries(
  NUMERIC_COMPARISON_OPERATORS.filter((o) => o.value !== 'all').map((o) => [o.value, o.label.toLowerCase()]),
);

export const CATALOG_NUMERIC_METRIC_FIELDS = [
  { value: 'all', label: 'Selecione a métrica' },
  { value: 'markup', label: 'Markup %' },
  { value: 'margem', label: 'Margem %' },
  { value: 'preco_venda', label: 'Preço de venda' },
  { value: 'valor_compra', label: 'Valor de compra' },
  { value: 'custo_total', label: 'Custo total' },
  { value: 'iep_score', label: 'Score IEP' },
  { value: 'iep_score_nivel_1', label: 'Média nível 1' },
  { value: 'iep_score_nivel_2', label: 'Média nível 2' },
];

export const CATALOG_NUMERIC_METRIC_LABELS = Object.fromEntries(
  CATALOG_NUMERIC_METRIC_FIELDS.filter((f) => f.value !== 'all').map((f) => [f.value, f.label]),
);

export const DEFAULT_CATALOG_METRIC_FILTER = {
  metricaCampo: 'all',
  metricaOperador: 'all',
  metricaValor: '',
  metricaValorAte: '',
};

export function parseNumericFilterValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasActiveNumericComparison(operador, valor, valorAte) {
  if (!operador || operador === 'all') return false;
  if (operador === 'between') {
    return (
      parseNumericFilterValue(valor) !== null ||
      parseNumericFilterValue(valorAte) !== null
    );
  }
  return parseNumericFilterValue(valor) !== null;
}

export function matchesNumericComparison(actual, operador, valor, valorAte) {
  if (!operador || operador === 'all') return true;
  const numericActual = Number(actual);
  if (!Number.isFinite(numericActual)) return false;

  const bound = parseNumericFilterValue(valor);
  const boundAte = parseNumericFilterValue(valorAte);

  switch (operador) {
    case 'gt':
      return bound === null ? true : numericActual > bound;
    case 'gte':
      return bound === null ? true : numericActual >= bound;
    case 'lt':
      return bound === null ? true : numericActual < bound;
    case 'lte':
      return bound === null ? true : numericActual <= bound;
    case 'between': {
      const min = bound !== null ? bound : -Infinity;
      const max = boundAte !== null ? boundAte : Infinity;
      return numericActual >= Math.min(min, max) && numericActual <= Math.max(min, max);
    }
    default:
      return true;
  }
}

export function hasActiveCatalogMetricFilter(filters) {
  if (!filters || filters.metricaCampo === 'all') return false;
  return hasActiveNumericComparison(
    filters.metricaOperador,
    filters.metricaValor,
    filters.metricaValorAte,
  );
}

export function getProdutoNumericMetricValue(produto, campo) {
  if (!produto || !campo || campo === 'all') return null;
  const cat = getCatalogoComercialView(produto);
  switch (campo) {
    case 'markup':
      return calcMarkup(produto);
    case 'margem':
      return cat.precoVenda > 0 && cat.custoNaEmbalagem >= 0 ? cat.margemContribuicaoPct : 0;
    case 'preco_venda':
      return cat.precoVenda;
    case 'valor_compra':
      return cat.valorCompraNaEmbalagem;
    case 'custo_total':
      return cat.custoNaEmbalagem;
    case 'iep_score':
    case 'iep_score_nivel_1':
    case 'iep_score_nivel_2':
    case 'iep_score_nivel_3':
    case 'iep_score_nivel_4':
    case 'iep_score_nivel_5':
      return Number(produto?.[campo]) || 0;
    default:
      return null;
  }
}

export function describeNumericComparison(operador, valor, valorAte) {
  const inicio = String(valor ?? '').trim();
  const fim = String(valorAte ?? '').trim();
  if (operador === 'between') {
    return `entre ${inicio || '-∞'} e ${fim || '+∞'}`;
  }
  return `${NUMERIC_COMPARISON_LABELS[operador] || operador} ${inicio}`;
}
