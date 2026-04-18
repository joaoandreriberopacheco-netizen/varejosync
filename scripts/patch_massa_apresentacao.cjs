const fs = require("fs");

function replace(rel, oldStr, newStr) {
  let c = fs.readFileSync(rel, "utf8");
  if (!c.includes(oldStr)) {
    const a = oldStr.replace(/\r\n/g, "\n");
    const b = newStr.replace(/\r\n/g, "\n");
    if (c.includes(a)) {
      c = c.replace(a, b);
      fs.writeFileSync(rel, c, "utf8");
      console.log("OK", rel);
      return;
    }
    throw new Error("not found " + rel);
  }
  c = c.replace(oldStr, newStr);
  fs.writeFileSync(rel, c, "utf8");
  console.log("OK", rel);
}

replace(
  "src/components/produtos/massa/colunasConfig.jsx",
  "  // --- Verificação (somente leitura) ---\r\n  { key: '_hash_orig'",
  "  { key: 'unidade_apresentacao_default', label: 'Apresentação PDV (sigla)', editavel: true, width: 22, tipo: 'string' },\r\n\r\n  // --- Verificação (somente leitura) ---\r\n  { key: '_hash_orig'"
);

replace(
  "src/components/produtos/massa/ImportarPlanilha.jsx",
  "const camposValidos = ['campo_hierarquico_1', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5', 'codigo_barras', 'tipo', 'preco_venda_padrao', 'valor_compra', 'desconto_perc', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'custo_outros_padrao', 'preco_venda_percentual', 'preco_custo_calculado', 'unidade_principal', 'unidades_por_pacote', 'casas_decimais', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias', 'peso_kg', 'dimensoes_cm', 'abcd', 'preco_livre', 'controla_serial', 'controla_lote', 'controla_validade', 'ativo', 'nome', 'marca', 'categoria_nome', 'area_codigo'];",
  "const camposValidos = ['campo_hierarquico_1', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5', 'codigo_barras', 'tipo', 'preco_venda_padrao', 'valor_compra', 'desconto_perc', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'custo_outros_padrao', 'preco_venda_percentual', 'preco_custo_calculado', 'unidade_principal', 'unidade_apresentacao_default', 'unidades_por_pacote', 'casas_decimais', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias', 'peso_kg', 'dimensoes_cm', 'abcd', 'preco_livre', 'controla_serial', 'controla_lote', 'controla_validade', 'ativo', 'nome', 'marca', 'categoria_nome', 'area_codigo'];"
);

replace(
  "src/pages/EditarProdutosEmMassa.jsx",
  "const validFields = ['codigo_barras', 'marca', 'categoria_nome', 'area_codigo', 'valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'desconto_compra_padrao', 'preco_venda_percentual', 'preco_custo_calculado', 'unidade_principal', 'unidades_por_pacote', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias', 'peso_kg', 'dimensoes_cm', 'abcd', 'ativo', 'nome', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5'];",
  "const validFields = ['codigo_barras', 'marca', 'categoria_nome', 'area_codigo', 'valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'desconto_compra_padrao', 'preco_venda_percentual', 'preco_custo_calculado', 'unidade_principal', 'unidade_apresentacao_default', 'unidades_por_pacote', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias', 'peso_kg', 'dimensoes_cm', 'abcd', 'ativo', 'nome', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5'];"
);

replace(
  "src/pages/EditarProdutosEmMassa.jsx",
  "const validFields = ['tipo', 'preco_venda_padrao', 'campo_hierarquico_1', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5', 'codigo_barras', 'marca', 'categoria_nome', 'area_codigo', 'valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'desconto_compra_padrao', 'preco_venda_percentual', 'preco_custo_calculado', 'unidade_principal', 'unidades_por_pacote', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias', 'peso_kg', 'dimensoes_cm', 'abcd', 'ativo', 'nome'];",
  "const validFields = ['tipo', 'preco_venda_padrao', 'campo_hierarquico_1', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5', 'codigo_barras', 'marca', 'categoria_nome', 'area_codigo', 'valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'desconto_compra_padrao', 'preco_venda_percentual', 'preco_custo_calculado', 'unidade_principal', 'unidade_apresentacao_default', 'unidades_por_pacote', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias', 'peso_kg', 'dimensoes_cm', 'abcd', 'ativo', 'nome'];"
);

replace(
  "base44/functions/importarProdutos/entry.ts",
  "      'preco_custo_calculado', 'unidade_principal', 'unidades_por_pacote',\r\n",
  "      'preco_custo_calculado', 'unidade_principal', 'unidade_apresentacao_default', 'unidades_por_pacote',\r\n"
);
