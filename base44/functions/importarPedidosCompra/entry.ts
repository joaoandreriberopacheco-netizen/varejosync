import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
    const { file_content } = body;
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
      'Valor Compra (R$)': 'valor_compra', 'Frete Padrão (R$)': 'custo_frete_padrao',
      'Imposto 1': 'custo_imposto1_padrao', 'Imposto 2': 'custo_imposto2_padrao',
      'Desconto Compra': 'desconto_compra_padrao', 'Custo Total Calculado': '__custo_calc',
      'Preço Venda (*)': 'preco_venda_padrao', 'Unidade': 'unidade_principal',
      'Qtd/Pacote': 'unidades_por_pacote', 'Estoque Mínimo': 'estoque_minimo',
      'Estoque Ideal': 'estoque_ideal', 'Estoque Máximo': 'estoque_maximo',
      'Tempo Reposição (dias)': 'tempo_reposicao_dias', 'Peso (kg)': 'peso_kg',
      'Dimensões (cm)': 'dimensoes_cm', 'Ativo (SIM/NÃO)': 'ativo',
    };
    const PROD_NUM_KEYS = new Set(['valor_compra','custo_frete_padrao','custo_imposto1_padrao',
      'custo_imposto2_padrao','desconto_compra_padrao','preco_venda_padrao',
      'unidades_por_pacote','estoque_minimo','estoque_ideal','estoque_maximo',
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

      // Linha vazia — pular
      if (!id && !h1) continue;

      // Validar ABCD
      if (dados.abcd && !ABCD_VALIDOS.has(dados.abcd)) {
        log.erros.push(`Produtos linha ${rowNum}: Curva ABCD inválida "${dados.abcd}". Use A, B, C ou D.`);
        continue;
      }

      // Recalcular custo e nome
      const custoCalc = (num(dados.valor_compra) || 0) + (num(dados.custo_frete_padrao) || 0) +
                        (num(dados.custo_imposto1_padrao) || 0) + (num(dados.custo_imposto2_padrao) || 0) -
                        (num(dados.desconto_compra_padrao) || 0);
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
        const novo = await base44.asServiceRole.entities.Produto.create(dados);
        mapaProdsById[novo.id] = novo;
        if (novo.nome) mapaProdsByNome[novo.nome.trim().toLowerCase()] = novo;
        log.produtos_criados.push(novo.nome || h1);
      } else {
        // Atualizar existente
        const prodAtual = mapaProdsById[id];
        if (!prodAtual) { log.erros.push(`Produtos linha ${rowNum}: ID "${id}" não encontrado.`); continue; }

        const diff = {};
        for (const [k, v] of Object.entries(dados)) {
          if (String(v ?? '') !== String(prodAtual[k] ?? '')) diff[k] = v;
        }
        if (Object.keys(diff).length > 0) {
          await base44.asServiceRole.entities.Produto.update(id, diff);
          Object.assign(mapaProdsById[id], diff);
          if (diff.nome) { delete mapaProdsByNome[prodAtual.nome?.trim().toLowerCase()]; mapaProdsByNome[diff.nome.trim().toLowerCase()] = mapaProdsById[id]; }
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
        const novo = await base44.asServiceRole.entities.Terceiro.create(dados);
        mapaFornsById[novo.id] = novo;
        if (novo.nome) mapaFornsByNome[novo.nome.trim().toLowerCase()] = novo;
        log.fornecedores_criados.push(novo.nome);
      } else {
        const fornAtual = mapaFornsById[id];
        if (!fornAtual) { log.erros.push(`Fornecedores linha ${rowNum}: ID "${id}" não encontrado.`); continue; }
        const diff = {};
        for (const [k, v] of Object.entries(dados)) {
          if (String(v ?? '') !== String(fornAtual[k] ?? '')) diff[k] = v;
        }
        if (Object.keys(diff).length > 0) {
          await base44.asServiceRole.entities.Terceiro.update(id, diff);
          Object.assign(mapaFornsById[id], diff);
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
      // Col A = ID produto, Col B = Nome produto (busca incremental), Col D = qtd, Col E = custo
      const prodIdCell   = str(getCellValue(row.getCell(1)));
      const prodNomeCell = str(getCellValue(row.getCell(2)));
      const qtd          = num(getCellValue(row.getCell(4)));
      const custo        = num(getCellValue(row.getCell(5)));

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
        custo_unitario: custo,
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

    // Gerar número do pedido — mesmo padrão do formulário (PC-00001)
    let numeroPedido = 'PC-00001';
    try {
      const todos = await base44.asServiceRole.entities.PedidoCompra.list();
      let maxNum = 0;
      for (const p of todos) {
        const m = (p.numero || '').match(/^PC-(\d+)$/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
      numeroPedido = `PC-${String(maxNum + 1).padStart(5, '0')}`;
    } catch (_) { /* usa padrão */ }

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