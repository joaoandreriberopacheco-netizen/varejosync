/**
 * Checksum de linha para export/import em massa de produtos (CRC16 sobre string canônica).
 * Deve ser idêntico entre export (valor em "Hash Verificação") e import (detecção de linha inalterada).
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

/**
 * @param {Record<string, unknown>} produto Objeto produto (API ou mesclado na importação)
 * @returns {string} Quatro caracteres hexadecimais maiúsculos
 */
export function computeProdutoLinhaChecksum(produto) {
  const concat = [
    normStr(produto.campo_hierarquico_1),
    normStr(produto.campo_hierarquico_2),
    normStr(produto.campo_hierarquico_3),
    normStr(produto.campo_hierarquico_4),
    normStr(produto.campo_hierarquico_5),
    normStr(produto.codigo_barras),
    normStr(produto.marca),
    normStr(produto.tipo),
    normStr(produto.abcd),
    normStr(produto.categoria_nome),
    normStr(produto.area_codigo),
    normNum(produto.valor_compra),
    normNum(produto.casas_decimais),
    normNum(produto.desconto_perc ?? 0),
    normNum(produto.custo_frete_padrao),
    normNum(produto.custo_imposto1_padrao),
    normNum(produto.custo_imposto2_padrao),
    normNum(produto.desconto_compra_padrao ?? 0),
    normNum(produto.preco_venda_padrao),
    normStr(produto.unidade_principal),
    normNum(produto.unidades_por_pacote),
    normNum(produto.estoque_minimo),
    normNum(produto.estoque_ideal),
    normNum(produto.estoque_maximo),
    normNum(produto.tempo_reposicao_dias),
    normNum(produto.peso_kg),
    normStr(produto.dimensoes_cm),
    produto.ativo !== false ? 'sim' : 'não',
  ].join('|');

  let crc = 0;
  for (let i = 0; i < concat.length; i++) {
    crc = ((crc << 8) ^ concat.charCodeAt(i)) & 0xffff;
  }
  return crc.toString(16).padStart(4, '0').toUpperCase();
}
