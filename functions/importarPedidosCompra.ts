import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const XLSX = await import('npm:xlsx@0.18.5');

    const body = await req.json();
    const { file_content } = body; // Base64

    if (!file_content) {
      return Response.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    }

    // Decodificar Base64 → Uint8Array
    const binaryStr = atob(file_content);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const wb = XLSX.read(bytes, { type: 'array' });
    const ws = wb.Sheets['Pedido'];
    if (!ws) return Response.json({ error: 'Aba "Pedido" não encontrada no arquivo.' }, { status: 400 });

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // ─── Ler cabeçalho do pedido (linhas 2–12, coluna B = índice 1) ────────
    const getVal = (row) => rows[row] ? String(rows[row][1] || '').trim() : '';

    const fornecedorId      = getVal(2);
    const fornecedorNome    = getVal(3);
    const fornecedorTipo    = getVal(4) || 'Fornecedor';
    const fornecedorCnpj    = getVal(5);
    const fornecedorEmail   = getVal(6);
    const fornecedorTel     = getVal(7);
    const fornecedorCidade  = getVal(8);
    const fornecedorEstado  = getVal(9);
    const dataPrevEntrega   = getVal(10);
    const observacoesPedido = getVal(11);

    // ─── Validar fornecedor ───────────────────────────────────────────────
    let resolvedFornecedorId = fornecedorId || null;
    let resolvedFornecedorNome = '';

    if (!resolvedFornecedorId) {
      if (!fornecedorNome) {
        return Response.json({
          error: 'Campo obrigatório ausente: "Fornecedor Nome" ou "Fornecedor ID" deve ser preenchido no cabeçalho.'
        }, { status: 400 });
      }

      // Tentar encontrar pelo nome
      const existentes = await base44.asServiceRole.entities.Terceiro.filter({ nome: fornecedorNome });
      if (existentes && existentes.length > 0) {
        resolvedFornecedorId = existentes[0].id;
        resolvedFornecedorNome = existentes[0].nome;
      } else {
        // Cadastrar novo fornecedor
        const novoFornecedor = await base44.asServiceRole.entities.Terceiro.create({
          nome: fornecedorNome,
          tipo: ['Fornecedor', 'Cliente', 'Ambos'].includes(fornecedorTipo) ? fornecedorTipo : 'Fornecedor',
          cpf_cnpj: fornecedorCnpj || undefined,
          email: fornecedorEmail || undefined,
          telefone: fornecedorTel || undefined,
          cidade: fornecedorCidade || undefined,
          estado: fornecedorEstado || undefined,
          ativo: true,
        });
        resolvedFornecedorId = novoFornecedor.id;
        resolvedFornecedorNome = novoFornecedor.nome;
      }
    } else {
      // Buscar nome do fornecedor existente pelo ID
      try {
        const forn = await base44.asServiceRole.entities.Terceiro.get(resolvedFornecedorId);
        resolvedFornecedorNome = forn?.nome || '';
      } catch (_) {
        return Response.json({ error: `Fornecedor ID "${resolvedFornecedorId}" não encontrado.` }, { status: 400 });
      }
    }

    // ─── Ler itens (a partir da linha 17, índice 16) ──────────────────────
    // Linha 14 (índice 14) = "=== ITENS DO PEDIDO ==="
    // Linha 15 (índice 15) = cabeçalho das colunas
    // Linha 16 (índice 16) = instruções
    // Linha 17 (índice 17) em diante = dados

    const ITEM_START = 17;
    const itensProcessados = [];
    const erros = [];
    const novosProdutos = [];
    const novosForns = 0;

    for (let i = ITEM_START; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every(c => String(c || '').trim() === '')) continue; // linha vazia

      const produtoId         = String(r[0] || '').trim();
      const nivel1            = String(r[1] || '').trim();
      const nivel2            = String(r[2] || '').trim();
      const nivel3            = String(r[3] || '').trim();
      const nivel4            = String(r[4] || '').trim();
      const nivel5            = String(r[5] || '').trim();
      const marca             = String(r[6] || '').trim();
      const tipoProduto       = String(r[7] || 'Produto').trim();
      const unidadePrincipal  = String(r[8] || 'UN').trim();
      const precoVenda        = parseFloat(String(r[9] || '0').replace(',', '.')) || 0;
      const estMin            = parseFloat(String(r[10] || '0').replace(',', '.')) || 0;
      const estIdeal          = parseFloat(String(r[11] || '0').replace(',', '.')) || 0;
      const estMax            = parseFloat(String(r[12] || '0').replace(',', '.')) || 0;
      const tempoReposicao    = parseFloat(String(r[13] || '0').replace(',', '.')) || undefined;
      const unidadesPorPacote = parseFloat(String(r[14] || '1').replace(',', '.')) || 1;
      const pesoKg            = parseFloat(String(r[15] || '').replace(',', '.')) || undefined;
      const categoriaNome     = String(r[16] || '').trim();
      const fornPadraoId      = String(r[17] || '').trim();
      const quantidade        = parseFloat(String(r[18] || '').replace(',', '.'));
      const custoUnitario     = parseFloat(String(r[19] || '').replace(',', '.'));

      // Validar campos obrigatórios do item
      if (isNaN(quantidade) || quantidade <= 0) {
        erros.push(`Linha ${i + 1}: "Quantidade Pedido" é obrigatória e deve ser maior que zero.`);
        continue;
      }
      if (isNaN(custoUnitario) || custoUnitario < 0) {
        erros.push(`Linha ${i + 1}: "Custo Unitário" é obrigatório e deve ser >= 0.`);
        continue;
      }

      let resolvedProdutoId = produtoId || null;
      let resolvedProdutoNome = '';

      if (!resolvedProdutoId) {
        // Novo produto — validar obrigatórios
        if (!nivel1) {
          erros.push(`Linha ${i + 1}: "Nível 1" é obrigatório para cadastrar um novo produto.`);
          continue;
        }
        if (!unidadePrincipal) {
          erros.push(`Linha ${i + 1}: "Unidade Principal" é obrigatória para cadastrar um novo produto.`);
          continue;
        }
        if (!precoVenda && precoVenda !== 0) {
          erros.push(`Linha ${i + 1}: "Preço de Venda Padrão" é obrigatório para cadastrar um novo produto.`);
          continue;
        }

        // Gerar nome concatenado
        const nomePartes = [nivel1, nivel2, nivel3, nivel4, nivel5].filter(Boolean);
        const nomeProduto = nomePartes.join(' ');

        const produtoData = {
          campo_hierarquico_1: nivel1,
          campo_hierarquico_2: nivel2 || undefined,
          campo_hierarquico_3: nivel3 || undefined,
          campo_hierarquico_4: nivel4 || undefined,
          campo_hierarquico_5: nivel5 || undefined,
          nome: nomeProduto,
          marca: marca || undefined,
          tipo: ['Produto', 'Serviço'].includes(tipoProduto) ? tipoProduto : 'Produto',
          unidade_principal: unidadePrincipal || 'UN',
          preco_venda_padrao: precoVenda,
          estoque_minimo: estMin || 0,
          estoque_ideal: estIdeal || 0,
          estoque_maximo: estMax || 0,
          tempo_reposicao_dias: tempoReposicao || undefined,
          unidades_por_pacote: unidadesPorPacote || 1,
          peso_kg: pesoKg || undefined,
          categoria_nome: categoriaNome || undefined,
          fornecedor_padrao_id: fornPadraoId || undefined,
          ativo: true,
        };

        const novoProduto = await base44.asServiceRole.entities.Produto.create(produtoData);
        resolvedProdutoId = novoProduto.id;
        resolvedProdutoNome = novoProduto.nome;
        novosProdutos.push(resolvedProdutoNome);
      } else {
        // Produto existente — buscar nome
        try {
          const prod = await base44.asServiceRole.entities.Produto.get(resolvedProdutoId);
          resolvedProdutoNome = prod?.nome || resolvedProdutoId;
        } catch (_) {
          erros.push(`Linha ${i + 1}: Produto ID "${resolvedProdutoId}" não encontrado.`);
          continue;
        }
      }

      itensProcessados.push({
        produto_id: resolvedProdutoId,
        produto_nome: resolvedProdutoNome,
        quantidade,
        custo_unitario: custoUnitario,
        quantidade_vinculada: 0,
        total: quantidade * custoUnitario,
      });
    }

    if (itensProcessados.length === 0) {
      return Response.json({
        error: 'Nenhum item válido encontrado para criar o pedido.',
        erros,
      }, { status: 400 });
    }

    // ─── Criar número do pedido ───────────────────────────────────────────
    let numeroPedido = 'PC-001';
    try {
      const ultimosPedidos = await base44.asServiceRole.entities.PedidoCompra.list('-created_date', 1);
      if (ultimosPedidos && ultimosPedidos.length > 0 && ultimosPedidos[0].numero) {
        const match = ultimosPedidos[0].numero.match(/(\d+)$/);
        if (match) {
          const proximo = parseInt(match[1]) + 1;
          numeroPedido = `PC-${String(proximo).padStart(3, '0')}`;
        }
      }
    } catch (_) { /* usa padrão */ }

    // ─── Calcular valor total ─────────────────────────────────────────────
    const valorTotal = itensProcessados.reduce((sum, item) => sum + item.total, 0);

    // ─── Criar pedido de compra ───────────────────────────────────────────
    const pedido = await base44.asServiceRole.entities.PedidoCompra.create({
      numero: numeroPedido,
      fornecedor_id: resolvedFornecedorId,
      fornecedor_nome: resolvedFornecedorNome,
      data_prevista_entrega: dataPrevEntrega || undefined,
      status: 'Rascunho',
      status_aprovacao_financeira: 'Pendente',
      status_conferencia_pedido: 'Não Iniciada',
      itens: itensProcessados,
      valor_total: valorTotal,
      observacoes: observacoesPedido || undefined,
      nfe_emitida: false,
      manifesto_conferido: false,
      tem_divergencias: false,
      aprovacao_reabertura_financeiro: false,
    });

    return Response.json({
      success: true,
      pedido_id: pedido.id,
      pedido_numero: pedido.numero,
      itens_criados: itensProcessados.length,
      novos_produtos: novosProdutos,
      novos_fornecedores: resolvedFornecedorId && !fornecedorId ? [resolvedFornecedorNome] : [],
      erros,
    });

  } catch (error) {
    console.error('Erro ao importar pedido:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});