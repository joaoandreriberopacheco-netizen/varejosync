import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
// phase: 'analyze' → só lê e valida, sem gravar no banco
// phase: 'import'  → processa tudo e grava (padrão)

// ── Helpers ───────────────────────────────────────────────────────────────────
function getCellValue(cell) {
  if (!cell) return null;
  if (cell.value !== null && typeof cell.value === 'object' && 'result' in cell.value) return cell.value.result ?? null;
  return cell.value ?? null;
}
function str(v) { return v !== null && v !== undefined ? String(v).trim() : ''; }
function num(v) { const n = parseFloat(str(v).replace(',', '.')); return isNaN(n) ? null : n; }
function bool(v) { const s = str(v).toUpperCase(); return s === 'SIM' || s === 'TRUE' || s === '1'; }
function concatNome(...parts) { return parts.map(s => str(s)).filter(Boolean).join(' '); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ExcelJS = (await import('npm:exceljs@4.4.0')).default;
    const body = await req.json();
    const { file_content, phase = 'import' } = body;
    if (!file_content) return Response.json({ error: 'Arquivo não enviado.' }, { status: 400 });

    // Decodificar Base64
    const binaryStr = atob(file_content);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes.buffer);

    // Verificar abas obrigatórias
    const wsProd = wb.getWorksheet('Produtos Cadastrados');
    const wsForns = wb.getWorksheet('Fornecedores Cadastrados');
    const wsPedido = wb.getWorksheet('Pedido');
    if (!wsProd)   return Response.json({ error: 'Aba "Produtos Cadastrados" não encontrada.' }, { status: 400 });
    if (!wsForns)  return Response.json({ error: 'Aba "Fornecedores Cadastrados" não encontrada.' }, { status: 400 });
    if (!wsPedido) return Response.json({ error: 'Aba "Pedido" não encontrada.' }, { status: 400 });

    const log = { produtos_atualizados: [], produtos_criados: [], fornecedores_atualizados: [], fornecedores_criados: [], erros: [] };
    const dryRun = phase === 'analyze';

    // ════════════════════════════════════════════════════════════════════════
    // FASE 1 — Processar aba "Produtos Cadastrados"
    // ════════════════════════════════════════════════════════════════════════
    const prodHeaderRow = wsProd.getRow(1);
    const prodColMap = {};
    prodHeaderRow.eachCell((cell, cn) => {
      const label = str(getCellValue(cell));
      if (label) prodColMap[label] = cn;
    });

    // Mapeamento label → key
    const PROD_LABEL_KEY = {
      'ID (não editar)': 'id', 'Cód. Interno': 'codigo_interno', 'Nome Completo': 'nome',
      'Nível 1 (*)': 'campo_hierarquico_1', 'Nível 2': 'campo_hierarquico_2',
      'Nível 3': 'campo_hierarquico_3', 'Nível 4': 'campo_hierarquico_4', 'Nível 5': 'campo_hierarquico_5',
      'Cód. Barras': 'codigo_barras', 'Marca': 'marca', 'Tipo': 'tipo', 'Curva ABCD': 'abcd',
      'Categoria': 'categoria_nome', 'Área': 'area_codigo',
      'Valor Compra (R$)': 'valor_compra', 'Desconto (%)': 'desconto_perc', 'Frete Padrão (R$)': 'custo_frete_padrao',
      'Imposto 1': 'custo_imposto1_padrao', 'Imposto 2': 'custo_imposto2_padrao',
      'Custo Total Calculado': '__custo_calc', 'Preço Venda (*)': 'preco_venda_padrao',
      'Unidade': 'unidade_principal', 'Casas Decimais': 'casas_decimais', 'Qtd/Pacote': 'unidades_por_pacote', 'Estoque Mínimo': 'estoque_minimo',
      'Estoque Ideal': 'estoque_ideal', 'Estoque Máximo': 'estoque_maximo',
      'Tempo Reposição (dias)': 'tempo_reposicao_dias', 'Peso (kg)': 'peso_kg',
      'Dimensões (cm)': 'dimensoes_cm', 'Ativo (SIM/NÃO)': 'ativo',
    };
    const PROD_NUM_KEYS = new Set(['valor_compra','desconto_perc','custo_frete_padrao','custo_imposto1_padrao',
      'custo_imposto2_padrao','preco_venda_padrao','casas_decimais','unidades_por_pacote','estoque_minimo','estoque_ideal','estoque_maximo',
      'tempo_reposicao_dias','peso_kg','__custo_calc']);
    const PROD_BOOL_KEYS = new Set(['ativo']);
    const PROD_READONLY  = new Set(['id','codigo_interno','nome','__custo_calc']);
    const ABCD_VALIDOS   = new Set(['A','B','C','D']);

    // Carregar produtos existentes em memória
    const produtosExistentes = await base44.asServiceRole.entities.Produto.list();
    const mapaProdsById   = {};
    const mapaProdsByNome = {};
    produtosExistentes.forEach(p => {
      mapaProdsById[p.id]  = p;
      if (p.nome) mapaProdsByNome[p.nome.trim().toLowerCase()] = p;
    });

    let rowNum = 0;
    for (const row of wsProd._rows || []) {
      rowNum++;
      if (!row || rowNum === 1) continue;

      // Extrair dados
      const dados = {};
      for (const [label, cn] of Object.entries(prodColMap)) {
        const key = PROD_LABEL_KEY[label];
        if (!key || PROD_READONLY.has(key)) continue;
        let val = getCellValue(row.getCell ? row.getCell(cn) : null);
        if (PROD_NUM_KEYS.has(key))  val = num(val);
        else if (PROD_BOOL_KEYS.has(key)) val = bool(val);
        else val = str(val) || null;
        if (val !== null && val !== '') dados[key] = val;
      }

      const idCol = prodColMap['ID (não editar)'];
      const id = idCol ? str(getCellValue(row.getCell ? row.getCell(idCol) : null)) : '';
      const h1 = dados['campo_hierarquico_1'] || '';

      // Se produto existente e coluna "Alterado?" = "NÃO", pular completamente
      const alteradoCol = prodColMap['Alterado?'];
      if (id && alteradoCol) {
        const alteradoVal = str(getCellValue(row.getCell ? row.getCell(alteradoCol) : null));
        if (alteradoVal === 'NÃO') continue;
      }

      // Linha vazia — pular
      if (!id && !h1) continue;

      // Validar ABCD
      if (dados.abcd && !ABCD_VALIDOS.has(dados.abcd)) {
        log.erros.push(`Produtos linha ${rowNum}: Curva ABCD inválida "${dados.abcd}". Use A, B, C ou D.`);
        continue;
      }

      // Recalcular custo e nome
      const descontoPerc = num(dados.desconto_perc) || 0;
      const valorCompraLiquido = (num(dados.valor_compra) || 0) * (1 - (descontoPerc / 100));
      const custoCalc = valorCompraLiquido + (num(dados.custo_frete_padrao) || 0) +
                        (num(dados.custo_imposto1_padrao) || 0) + (num(dados.custo_imposto2_padrao) || 0);
      const nomeGerado = concatNome(dados.campo_hierarquico_1, dados.campo_hierarquico_2,
                                     dados.campo_hierarquico_3, dados.campo_hierarquico_4, dados.campo_hierarquico_5);
      if (nomeGerado) { dados.nome = nomeGerado; mapaProdsById[id]?.nome; }
      dados.preco_custo_calculado = custoCalc;
      if (dados.preco_venda_padrao && custoCalc > 0) {
        dados.preco_venda_percentual = parseFloat((((dados.preco_venda_padrao - custoCalc) / custoCalc) * 100).toFixed(2));
      }

      if (!id) {
        // Novo produto
        if (!h1) { log.erros.push(`Produtos linha ${rowNum}: Nível 1 obrigatório para novo produto.`); continue; }
        if (!dados.preco_venda_padrao && dados.preco_venda_padrao !== 0) {
          log.erros.push(`Produtos linha ${rowNum}: Preço de Venda obrigatório para novo produto.`); continue;
        }
        dados.tipo = dados.tipo || 'Produto';
        dados.unidade_principal = dados.unidade_principal || 'UN';
        if (!dryRun) {
          const novo = await base44.asServiceRole.entities.Produto.create(dados);
          mapaProdsById[novo.id] = novo;
          if (novo.nome) mapaProdsByNome[novo.nome.trim().toLowerCase()] = novo;
        }
        log.produtos_criados.push(h1);
      } else {
        // Atualizar existente
        const prodAtual = mapaProdsById[id];
        if (!prodAtual) { log.erros.push(`Produtos linha ${rowNum}: ID "${id}" não encontrado.`); continue; }

        const diff = {};
        for (const [k, v] of Object.entries(dados)) {
          if (String(v ?? '') !== String(prodAtual[k] ?? '')) diff[k] = v;
        }
        if (Object.keys(diff).length > 0) {
          if (!dryRun) {
            await base44.asServiceRole.entities.Produto.update(id, diff);
            Object.assign(mapaProdsById[id], diff);
            if (diff.nome) { delete mapaProdsByNome[prodAtual.nome?.trim().toLowerCase()]; mapaProdsByNome[diff.nome.trim().toLowerCase()] = mapaProdsById[id]; }
          }
          log.produtos_atualizados.push(prodAtual.nome || id);
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // FASE 2 — Processar aba "Fornecedores Cadastrados"
    // ════════════════════════════════════════════════════════════════════════
    const fornHeaderRow = wsForns.getRow(1);
    const fornColMap = {};
    fornHeaderRow.eachCell((cell, cn) => { const l = str(getCellValue(cell)); if (l) fornColMap[l] = cn; });

    const FORN_LABEL_KEY = {
      'ID (não editar)': 'id', 'Cód. Interno': 'codigo_interno',
      'Nome (*)': 'nome', 'CPF/CNPJ': 'cpf_cnpj', 'E-mail': 'email',
      'Telefone': 'telefone', 'Endereço': 'endereco', 'Bairro': 'bairro',
      'Cidade': 'cidade', 'Estado (UF)': 'estado', 'CEP': 'cep',
      'Tipo': 'tipo', 'Perfil': 'perfil', 'Observações': 'observacoes',
      'Ativo (SIM/NÃO)': 'ativo',
    };
    const FORN_BOOL_KEYS  = new Set(['ativo']);
    const FORN_READONLY   = new Set(['id','codigo_interno']);
    const TIPO_FORN_VALID = new Set(['Cliente','Fornecedor','Ambos']);

    const fornsExistentes = await base44.asServiceRole.entities.Terceiro.list();
    const mapaFornsById   = {};
    const mapaFornsByNome = {};
    fornsExistentes.forEach(f => {
      mapaFornsById[f.id] = f;
      if (f.nome) mapaFornsByNome[f.nome.trim().toLowerCase()] = f;
    });

    rowNum = 0;
    for (const row of wsForns._rows || []) {
      rowNum++;
      if (!row || rowNum === 1) continue;

      const dados = {};
      for (const [label, cn] of Object.entries(fornColMap)) {
        const key = FORN_LABEL_KEY[label];
        if (!key || FORN_READONLY.has(key)) continue;
        let val = getCellValue(row.getCell ? row.getCell(cn) : null);
        if (FORN_BOOL_KEYS.has(key)) val = bool(val);
        else val = str(val) || null;
        if (val !== null && val !== '') dados[key] = val;
      }

      const idCol = fornColMap['ID (não editar)'];
      const id    = idCol ? str(getCellValue(row.getCell ? row.getCell(idCol) : null)) : '';
      const nome  = dados['nome'] || '';

      if (!id && !nome) continue;

      if (dados.tipo && !TIPO_FORN_VALID.has(dados.tipo)) {
        log.erros.push(`Fornecedores linha ${rowNum}: Tipo inválido "${dados.tipo}".`); continue;
      }

      if (!id) {
        if (!nome) { log.erros.push(`Fornecedores linha ${rowNum}: Nome obrigatório para novo fornecedor.`); continue; }
        dados.tipo = dados.tipo || 'Fornecedor';
        if (!dryRun) {
          const novo = await base44.asServiceRole.entities.Terceiro.create(dados);
          mapaFornsById[novo.id] = novo;
          if (novo.nome) mapaFornsByNome[novo.nome.trim().toLowerCase()] = novo;
        }
        log.fornecedores_criados.push(nome);
      } else {
        const fornAtual = mapaFornsById[id];
        if (!fornAtual) { log.erros.push(`Fornecedores linha ${rowNum}: ID "${id}" não encontrado.`); continue; }
        const diff = {};
        for (const [k, v] of Object.entries(dados)) {
          if (String(v ?? '') !== String(fornAtual[k] ?? '')) diff[k] = v;
        }
        if (Object.keys(diff).length > 0) {
          if (!dryRun) {
            await base44.asServiceRole.entities.Terceiro.update(id, diff);
            Object.assign(mapaFornsById[id], diff);
          }
          log.fornecedores_atualizados.push(fornAtual.nome || id);
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // FASE 3 — Processar aba "Pedido"
    // ════════════════════════════════════════════════════════════════════════
    // Cabeçalho (linhas 3-5: Forn ID, Data, Observações)
    const getFornRow = (rn) => wsPedido.getRow(rn);

    const fornecedorId     = str(getCellValue(getFornRow(3).getCell(2)));
    const dataPrevEntrega  = str(getCellValue(getFornRow(4).getCell(2)));
    const observacoesPed   = str(getCellValue(getFornRow(5).getCell(2)));

    if (!fornecedorId) {
      return Response.json({
        error: 'Campo obrigatório: "Fornecedor ID" deve ser preenchido na aba Pedido (célula B3). Use o ID da aba "Fornecedores Cadastrados".',
        log,
      }, { status: 400 });
    }

    const fornecedor = mapaFornsById[fornecedorId];
    if (!fornecedor) {
      return Response.json({
        error: `Fornecedor ID "${fornecedorId}" não encontrado. Verifique a aba "Fornecedores Cadastrados".`,
        log,
      }, { status: 400 });
    }

    // Ler itens (linha 15 em diante)
    const itens = [];
    for (let rn = 15; rn <= 514; rn++) {
      const row = wsPedido.getRow(rn);
      // Col A=ID(calc) | B=Nome | C=Quantidade | D=Valor de Compra | E=Desconto% | F=Valor Líquido | G=Total
      const prodIdCell   = str(getCellValue(row.getCell(1)));
      const prodNomeCell = str(getCellValue(row.getCell(2)));
      const qtd          = num(getCellValue(row.getCell(3)));  // Col C = Quantidade
      const custo        = num(getCellValue(row.getCell(4)));  // Col D = Valor de Compra

      if (!prodIdCell && !prodNomeCell) continue;
      if (qtd === null || qtd <= 0) {
        log.erros.push(`Pedido linha ${rn}: Quantidade inválida ou ausente.`); continue;
      }
      if (custo === null || custo < 0) {
        log.erros.push(`Pedido linha ${rn}: Custo Unitário inválido ou ausente.`); continue;
      }

      // Resolver produto: primeiro por ID, depois por nome
      let produto = prodIdCell ? mapaProdsById[prodIdCell] : null;
      if (!produto && prodNomeCell) {
        produto = mapaProdsByNome[prodNomeCell.trim().toLowerCase()];
      }
      if (!produto) {
        log.erros.push(`Pedido linha ${rn}: Produto "${prodIdCell || prodNomeCell}" não encontrado nas abas de cadastro. Linha rejeitada.`);
        continue;
      }

      itens.push({
        produto_id: produto.id,
        produto_nome: produto.nome || prodNomeCell,
        quantidade: qtd,
        unidade_medida: produto.unidade_principal || 'UN',
        fator_conversao: 1,
        quantidade_base: qtd,
        custo_unitario: custo,
        custo_final_unitario: custo,
        preco_eixo: 'FATOR_1',
        unidade_apresentacao: produto.unidade_principal || 'UN',
        custo_unitario_base: custo,
        custo_final_unitario_base: custo,
        custo_unitario_apresentacao: custo,
        custo_final_unitario_apresentacao: custo,
        quantidade_vinculada: 0,
        total: qtd * custo,
      });
    }

    if (itens.length === 0) {
      return Response.json({
        error: 'Nenhum item válido encontrado na aba "Pedido".',
        log,
      }, { status: 400 });
    }

    // Se apenas análise, retorna resumo sem gravar
    if (dryRun) {
      return Response.json({
        success: true,
        dry_run: true,
        fornecedor_nome: fornecedor.nome,
        itens_count: itens.length,
        produtos_novos: log.produtos_criados.length,
        produtos_atualizados: log.produtos_atualizados.length,
        fornecedores_novos: log.fornecedores_criados.length,
        fornecedores_atualizados: log.fornecedores_atualizados.length,
        erros: log.erros,
        data_prevista_entrega: dataPrevEntrega || null,
        observacoes: observacoesPed || null,
      });
    }

    const numerosExistentes = new Set(
      (await base44.asServiceRole.entities.PedidoCompra.list())
        .map((p) => String(p.numero || '').trim().toUpperCase())
        .filter(Boolean)
    );

    const gerarCodigoAleatorio = (tamanho = 5) => {
      const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let resultado = '';
      const array = new Uint32Array(tamanho);
      crypto.getRandomValues(array);
      for (let i = 0; i < tamanho; i++) {
        resultado += caracteres[array[i] % caracteres.length];
      }
      return resultado;
    };

    let numeroPedido = '';
    for (let tentativa = 0; tentativa < 50; tentativa++) {
      const candidato = gerarCodigoAleatorio(5);
      if (!numerosExistentes.has(candidato)) {
        numeroPedido = candidato;
        break;
      }
    }

    if (!numeroPedido) {
      return Response.json({ error: 'Não foi possível gerar um identificador único para o pedido.' }, { status: 500 });
    }

    const valorTotal = itens.reduce((s, i) => s + i.total, 0);

    const pedido = await base44.asServiceRole.entities.PedidoCompra.create({
      numero: numeroPedido,
      fornecedor_id: fornecedor.id,
      fornecedor_nome: fornecedor.nome,
      data_prevista_entrega: dataPrevEntrega || undefined,
      status: 'Rascunho',
      status_aprovacao_financeira: 'Pendente',
      status_conferencia_pedido: 'Não Iniciada',
      itens,
      valor_total: valorTotal,
      observacoes: observacoesPed || undefined,
      nfe_emitida: false,
      manifesto_conferido: false,
      tem_divergencias: false,
      aprovacao_reabertura_financeiro: false,
    });

    return Response.json({
      success: true,
      pedido_id: pedido.id,
      pedido_numero: pedido.numero,
      itens_criados: itens.length,
      log,
    });

  } catch (error) {
    console.error('Erro ao importar pedido:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});