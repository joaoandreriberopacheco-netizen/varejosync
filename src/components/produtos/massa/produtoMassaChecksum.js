/**
 * Checksum de linha para export/import em massa de produtos (CRC16 sobre string canônica).
 * Ordem dos segmentos = fonte única para hash, import e fórmula visual no Excel.
 */

function normNum(value) {
  if (value === null || value === undefined || value === '') return '0';
  const normalized = String(value).trim().replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? '0' : Math.round(parsed * 100).toString();
}

function normStr(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/** Metadados de cada segmento (mesma ordem do concat). kind: str | num | ativo */
export const PRODUTO_CANON_SEGMENTS = [
  { key: 'campo_hierarquico_1', kind: 'str' },
  { key: 'campo_hierarquico_2', kind: 'str' },
  { key: 'campo_hierarquico_3', kind: 'str' },
  { key: 'campo_hierarquico_4', kind: 'str' },
  { key: 'campo_hierarquico_5', kind: 'str' },
  { key: 'codigo_barras', kind: 'str' },
  { key: 'marca', kind: 'str' },
  { key: 'tipo', kind: 'str' },
  { key: 'abcd', kind: 'str' },
  { key: 'categoria_nome', kind: 'str' },
  { key: 'area_codigo', kind: 'str' },
  { key: 'valor_compra', kind: 'num' },
  { key: 'casas_decimais', kind: 'num' },
  { key: 'desconto_perc', kind: 'num' },
  { key: 'custo_frete_padrao', kind: 'num' },
  { key: 'custo_imposto1_padrao', kind: 'num' },
  { key: 'custo_imposto2_padrao', kind: 'num' },
  { key: 'desconto_compra_padrao', kind: 'num' },
  { key: 'preco_venda_padrao', kind: 'num' },
  { key: 'unidade_principal', kind: 'str' },
  { key: 'unidades_por_pacote', kind: 'num' },
  { key: 'estoque_minimo', kind: 'num' },
  { key: 'estoque_ideal', kind: 'num' },
  { key: 'estoque_maximo', kind: 'num' },
  { key: 'tempo_reposicao_dias', kind: 'num' },
  { key: 'peso_kg', kind: 'num' },
  { key: 'dimensoes_cm', kind: 'str' },
  { key: 'ativo', kind: 'ativo' },
];

function segmentValue(produto, seg) {
  if (seg.kind === 'str') return normStr(produto[seg.key]);
  if (seg.kind === 'num') return normNum(produto[seg.key] ?? 0);
  if (seg.kind === 'ativo') return produto.ativo !== false ? 'sim' : 'não';
  return '';
}

/**
 * String canônica usada no CRC (deve bater com o texto guardado na coluna oculta na exportação).
 */
export function produtoLinhaCanonico(produto) {
  return PRODUTO_CANON_SEGMENTS.map(seg => segmentValue(produto, seg)).join('|');
}

/**
 * Monta expressão Excel (funções em inglês, vírgula) que reproduz o texto canônico da linha.
 * @param {number} rowNumber
 * @param {(key: string) => string} colLetter retorna letra(s) da coluna para cada key
 */
export function buildExcelCanonConcatExpr(rowNumber, colLetter) {
  const sep = '&"|"&';
  const parts = PRODUTO_CANON_SEGMENTS.map(({ key, kind }) => {
    const L = colLetter(key);
    const ref = `${L}${rowNumber}`;
    if (kind === 'str') return `TRIM(${ref}&"")`;
    if (kind === 'num') return `TEXT(IF(${ref}="",0,ROUND(${ref}*100,0)),"0")`;
    if (kind === 'ativo') {
      return `IF(OR(${ref}="false",${ref}="FALSE",${ref}="falso"),"não","sim")`;
    }
    return `TRIM(${ref}&"")`;
  });
  return parts.join(sep);
}

/**
 * @param {Record<string, unknown>} produto Objeto produto (API ou mesclado na importação)
 * @returns {string} Quatro caracteres hexadecimais maiúsculos
 */
export function computeProdutoLinhaChecksum(produto) {
  const concat = produtoLinhaCanonico(produto);
  let crc = 0;
  for (let i = 0; i < concat.length; i++) {
    crc = ((crc << 8) ^ concat.charCodeAt(i)) & 0xffff;
  }
  return crc.toString(16).padStart(4, '0').toUpperCase();
}
