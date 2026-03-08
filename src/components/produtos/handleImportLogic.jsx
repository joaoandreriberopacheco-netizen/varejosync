export const processarImportacaoUnificada = async (
  importFile,
  produtos,
  fornecedores,
  base44,
  toast
) => {
  if (!importFile) {
    toast({ title: "Nenhum arquivo selecionado.", variant: "destructive" });
    return null;
  }

  try {
    const { file_url } = await base44.integrations.Core.UploadFile({ file: importFile });
    
    const produtosSchema = {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              "codigo_barras": { type: "string" },
              "campo_hierarquico_1": { type: "string" },
              "campo_hierarquico_2": { type: "string" },
              "campo_hierarquico_3": { type: "string" },
              "campo_hierarquico_4": { type: "string" },
              "campo_hierarquico_5": { type: "string" },
              "nome": { type: "string" },
              "tipo": { type: "string" },
              "categoria": { type: "string" },
              "area_nome": { type: "string" },
              "marca": { type: "string" },
              "tags": { type: "string" },
              "imagem_url": { type: "string" },
              "valor_compra": { type: "number" },
              "frete_percentual": { type: "number" },
              "imposto_1_percentual": { type: "number" },
              "imposto_2_percentual": { type: "number" },
              "desconto_comercial_percentual": { type: "number" },
              "outros_custos_percentual": { type: "number" },
              "fornecedor_codigo": { type: "string" },
              "preco_venda_padrao": { type: "number" },
              "dimensoes_cm": { type: "string" },
              "peso_kg": { type: "number" },
              "tempo_reposicao_dias": { type: "number" },
              "estoque_atual": { type: "number" },
              "estoque_minimo": { type: "number" },
              "estoque_ideal": { type: "number" },
              "estoque_maximo": { type: "number" },
              "estoque_avariado": { type: "number" },
              "unidade_principal": { type: "string" },
              "unidades_por_pacote": { type: "number" },
              "controla_serial": { type: "boolean" },
              "controla_lote_validade": { type: "boolean" },
              "ativo": { type: "boolean" }
            },
            required: ["nome"],
            additionalProperties: true
          }
        }
      }
    };
    
    const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({ 
      file_url, 
      json_schema: produtosSchema 
    });

    if (extraction.status !== 'success' || !extraction.output || !extraction.output.data) {
      throw new Error(extraction.details || "Falha ao extrair dados.");
    }

    const importedData = extraction.output.data;
    const resumo = { novos: 0, atualizados: 0, erros: [], areasCriadas: 0 };
    const produtosValidados = [];

    // Carregar todas as áreas existentes antes do loop
    const areasExistentes = await base44.entities.Area.list();
    const areasMap = new Map(areasExistentes.map(area => [area.nome.toUpperCase().trim(), area]));

    for (const linha of importedData) {
      const errosLinha = [];
      
      if (!linha.nome) {
        errosLinha.push("Nome é obrigatório");
      }

      if (errosLinha.length > 0) {
        resumo.erros.push(`Produto '${linha.nome || 'Sem nome'}': ${errosLinha.join(', ')}`);
        continue;
      }

      // Verificar se produto já existe (por código de barras)
      let produtoExistente = null;
      if (linha.codigo_barras) {
        produtoExistente = produtos.find(p => p.codigo_barras === String(linha.codigo_barras));
      }
      const isUpdate = !!produtoExistente;

      // Buscar fornecedor pelo código
      let fornecedor_id = '';
      let fornecedor_codigo = '';
      if (linha.fornecedor_codigo) {
        const forn = fornecedores.find(f => f.codigo_interno === String(linha.fornecedor_codigo));
        if (forn) {
          fornecedor_id = forn.id;
          fornecedor_codigo = forn.codigo_interno;
        }
      }

      // Buscar ou criar Área
      let area_id = null;
      let area_codigo = null;
      if (linha.area_nome) {
        const nomeAreaFormatado = String(linha.area_nome).toUpperCase().trim();
        let areaEncontrada = areasMap.get(nomeAreaFormatado);

        if (!areaEncontrada) {
          const novoCodigoArea = `AREA-${(areasExistentes.length + resumo.areasCriadas + 1).toString().padStart(3, '0')}`;
          try {
            areaEncontrada = await base44.entities.Area.create({
              nome: nomeAreaFormatado,
              codigo: novoCodigoArea,
              ativo: true,
              descricao: `Área criada automaticamente via importação em ${new Date().toLocaleDateString('pt-BR')}`
            });
            areasMap.set(nomeAreaFormatado, areaEncontrada);
            resumo.areasCriadas++;
          } catch (createError) {
            errosLinha.push(`Erro ao criar área '${nomeAreaFormatado}': ${createError.message}`);
          }
        }
        
        if (areaEncontrada) {
          area_id = areaEncontrada.id;
          area_codigo = areaEncontrada.codigo;
        }
      }

      // Parse numerical values
      const parseNumber = (val) => {
        if (typeof val === 'string') {
          return parseFloat(val.replace(',', '.'));
        }
        return parseFloat(val);
      };

      const valorCompra = parseNumber(linha.valor_compra) || 0;
      const fretePercentual = parseNumber(linha.frete_percentual) || 0;
      const imposto1Percentual = parseNumber(linha.imposto_1_percentual) || 0;
      const imposto2Percentual = parseNumber(linha.imposto_2_percentual) || 0;
      const descontoComercialPercentual = parseNumber(linha.desconto_comercial_percentual) || 0;
      const outrosCustosPercentual = parseNumber(linha.outros_custos_percentual) || 0;

      const frete = valorCompra * (fretePercentual / 100);
      const imposto1 = valorCompra * (imposto1Percentual / 100);
      const imposto2 = valorCompra * (imposto2Percentual / 100);
      const desconto = valorCompra * (descontoComercialPercentual / 100);
      const outros = valorCompra * (outrosCustosPercentual / 100);
      
      const custoTotal = valorCompra + frete + imposto1 + imposto2 + outros - desconto;

      const precoVenda = parseNumber(linha.preco_venda_padrao) || 0;
      
      let markupPercentual = 0;
      if (custoTotal > 0 && precoVenda > custoTotal) {
        markupPercentual = ((precoVenda - custoTotal) / custoTotal) * 100;
      }

      let tipoProduto = 'Produto';
      if (linha.tipo && (String(linha.tipo).toLowerCase() === 'serviço' || String(linha.tipo) === '1')) {
        tipoProduto = 'Serviço';
      }

      let tagsArray = [];
      if (linha.tags && typeof linha.tags === 'string') {
        tagsArray = linha.tags.split(',').map(t => t.trim()).filter(t => t);
      }

      let volume_cm3 = 0;
      if (linha.dimensoes_cm) {
        const parts = String(linha.dimensoes_cm).split('x').map(p => parseFloat(p.trim()));
        if (parts.length === 3 && parts.every(p => !isNaN(p) && p > 0)) {
          volume_cm3 = parts[0] * parts[1] * parts[2];
        }
      }
      
      const h1 = (linha.campo_hierarquico_1 || linha.nome || '').toString().toUpperCase().trim();
      const h2 = (linha.campo_hierarquico_2 || '').toString().toUpperCase().trim();
      const h3 = (linha.campo_hierarquico_3 || '').toString().toUpperCase().trim();
      const h4 = (linha.campo_hierarquico_4 || '').toString().toUpperCase().trim();
      const h5 = (linha.campo_hierarquico_5 || '').toString().toUpperCase().trim();
      const nomeGerado = linha.nome?.trim()
        ? linha.nome.toUpperCase()
        : [h1, h2, h3, h4, h5].filter(Boolean).join(' | ');

      const produtoData = {
        id: isUpdate ? produtoExistente.id : undefined,
        campo_hierarquico_1: h1,
        campo_hierarquico_2: h2 || undefined,
        campo_hierarquico_3: h3 || undefined,
        campo_hierarquico_4: h4 || undefined,
        campo_hierarquico_5: h5 || undefined,
        nome: nomeGerado,
        codigo_barras: String(linha.codigo_barras || ''),
        tipo: tipoProduto,
        categoria_nome: linha.categoria ? linha.categoria.toUpperCase() : '',
        area_id: area_id,
        area_codigo: area_codigo,
        marca: linha.marca ? linha.marca.toUpperCase() : '',
        tags: tagsArray,
        imagem_url: linha.imagem_url || '',
        preco_venda_padrao: precoVenda,
        preco_venda_tipo: 'percentual',
        preco_venda_percentual: markupPercentual,
        preco_custo_calculado: custoTotal,
        valor_compra: valorCompra,
        unidade_principal: linha.unidade_principal || 'UN',
        unidades_por_pacote: parseInt(linha.unidades_por_pacote) || 1,
        estoque_atual: parseNumber(linha.estoque_atual) || 0,
        estoque_minimo: parseNumber(linha.estoque_minimo) || 0,
        estoque_ideal: parseNumber(linha.estoque_ideal) || 0,
        estoque_maximo: parseNumber(linha.estoque_maximo) || 0,
        estoque_avariado: parseNumber(linha.estoque_avariado) || 0,
        fornecedor_padrao_id: fornecedor_id || null,
        fornecedor_padrao_codigo: fornecedor_codigo || null,
        tempo_reposicao_dias: parseInt(linha.tempo_reposicao_dias) || 0,
        peso_kg: parseNumber(linha.peso_kg) || 0,
        dimensoes_cm: linha.dimensoes_cm || '',
        volume_cm3: volume_cm3,
        custo_frete_padrao: frete,
        custo_imposto1_padrao: imposto1,
        custo_imposto2_padrao: imposto2,
        desconto_compra_padrao: desconto,
        custo_outros_padrao: outros,
        controla_serial: (linha.controla_serial === true || String(linha.controla_serial).toLowerCase() === 'true'),
        controla_lote_validade: (linha.controla_lote_validade === true || String(linha.controla_lote_validade).toLowerCase() === 'true'),
        ativo: (linha.ativo === true || String(linha.ativo).toLowerCase() === 'true')
      };

      produtosValidados.push(produtoData);
      if (isUpdate) {
        resumo.atualizados++;
      } else {
        resumo.novos++;
      }
    }

    return { produtos: produtosValidados, resumo };

  } catch (error) {
    console.error("Erro no processamento da importação unificada:", error);
    toast({ 
      title: "Erro no Processamento", 
      description: error.message, 
      variant: "destructive" 
    });
    return null;
  }
};