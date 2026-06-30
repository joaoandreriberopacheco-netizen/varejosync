export const DEFAULT_CATALOG_PRODUTO_COLUMNS = [
  'status',
  'fornecedor',
  'estoque_atual',
  'preco_venda',
  'margem',
  'abcd',
  'show_logistica',
];

const CATALOG_PRODUTO_COLUMNS_STORAGE_KEY = 'varejosync.catalogoProdutoColumns';
const CATALOG_PRODUTO_COLUMNS_STORAGE_VERSION = 2;

const KNOWN_CATALOG_PRODUTO_COLUMNS = new Set([
  'status',
  'cadastro',
  'codigo_interno',
  'codigo_barras',
  'categoria',
  'tags',
  'fornecedor',
  'preco_venda',
  'preco_custo',
  'margem',
  'valor_compra',
  'markup',
  'estoque_atual',
  'estoque_minimo',
  'estoque_ideal',
  'estoque_maximo',
  'tempo_reposicao',
  'peso',
  'dimensoes',
  'tipo',
  'unidade',
  'unidades_pacote',
  'show_comercial',
  'show_logistica',
  'abcd',
  'inventario_valorizado',
]);

export function normalizeCatalogProdutoColumns(raw) {
  if (!Array.isArray(raw)) return [...DEFAULT_CATALOG_PRODUTO_COLUMNS];
  const unique = [];
  for (const col of raw) {
    if (KNOWN_CATALOG_PRODUTO_COLUMNS.has(col) && !unique.includes(col)) {
      unique.push(col);
    }
  }
  return unique.length > 0 ? unique : [...DEFAULT_CATALOG_PRODUTO_COLUMNS];
}

export function loadCatalogProdutoColumns() {
  try {
    const raw = localStorage.getItem(CATALOG_PRODUTO_COLUMNS_STORAGE_KEY);
    if (!raw) return [...DEFAULT_CATALOG_PRODUTO_COLUMNS];
    const parsed = JSON.parse(raw);
    const columns = normalizeCatalogProdutoColumns(Array.isArray(parsed) ? parsed : parsed?.columns);
    const version = Array.isArray(parsed) ? 1 : Number(parsed?.storageVersion) || 1;
    if (version < CATALOG_PRODUTO_COLUMNS_STORAGE_VERSION && !columns.includes('abcd')) {
      const margemIdx = columns.indexOf('margem');
      if (margemIdx >= 0) columns.splice(margemIdx + 1, 0, 'abcd');
      else columns.push('abcd');
    }
    return columns;
  } catch {
    return [...DEFAULT_CATALOG_PRODUTO_COLUMNS];
  }
}

export function saveCatalogProdutoColumns(columns) {
  try {
    localStorage.setItem(
      CATALOG_PRODUTO_COLUMNS_STORAGE_KEY,
      JSON.stringify({
        storageVersion: CATALOG_PRODUTO_COLUMNS_STORAGE_VERSION,
        columns: normalizeCatalogProdutoColumns(columns),
      })
    );
  } catch {
    /* quota / private mode */
  }
}
