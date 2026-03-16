import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { encodeBase64 } from "jsr:@std/encoding/base64";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const XLSX = await import('npm:xlsx@0.18.5');

    // Buscar dados reais do sistema
    const [produtos, fornecedores] = await Promise.all([
      base44.asServiceRole.entities.Produto.list(),
      base44.asServiceRole.entities.Terceiro.filter({ tipo: ['Fornecedor', 'Ambos'] }),
    ]);

    // ─── ABA 1: PEDIDO (preenchimento) ───────────────────────────────────────
    const pedidoHeader = [
      // Cabeçalho do pedido
      ['=== CABEÇALHO DO PEDIDO ==='],
      ['CAMPO', 'VALOR', 'INSTRUÇÕES'],
      ['Fornecedor ID',        '', '← Cole aqui o ID da aba "Fornecedores" (OU deixe vazio e preencha os campos abaixo)'],
      ['Fornecedor Nome',      '', '← OBRIGATÓRIO se Fornecedor ID vazio — novo fornecedor será cadastrado'],
      ['Fornecedor Tipo',      '', '← OBRIGATÓRIO se novo: Fornecedor | Cliente | Ambos'],
      ['Fornecedor CNPJ/CPF',  '', '← Opcional'],
      ['Fornecedor Email',     '', '← Opcional'],
      ['Fornecedor Telefone',  '', '← Opcional'],
      ['Fornecedor Cidade',    '', '← Opcional'],
      ['Fornecedor Estado',    '', '← Opcional'],
      ['Data Prevista Entrega','', '← Formato: AAAA-MM-DD'],
      ['Observações do Pedido','', '← Opcional'],
      [],
      // Cabeçalho dos itens
      ['=== ITENS DO PEDIDO ==='],
      [
        'Produto ID',
        'Nível 1 (Tipo/Produto)',
        'Nível 2',
        'Nível 3',
        'Nível 4',
        'Nível 5 (Marca)',
        'Marca',
        'Tipo (Produto/Serviço)',
        'Unidade Principal',
        'Preço de Venda Padrão',
        'Estoque Mínimo',
        'Estoque Ideal',
        'Estoque Máximo',
        'Tempo Reposição (dias)',
        'Unidades por Pacote',
        'Peso (kg)',
        'Categoria Nome',
        'Fornecedor Padrão ID',
        'Quantidade Pedido',
        'Custo Unitário',
        'Total'
      ],
      [
        '← ID do produto existente (aba "Produtos") OU vazio para novo produto',
        'OBRIGATÓRIO se novo produto',
        'Opcional',
        'Opcional',
        'Opcional',
        'Opcional',
        'Opcional',
        'OBRIGATÓRIO se novo: Produto | Serviço',
        'OBRIGATÓRIO se novo: UN, CX, KG, M, etc.',
        'OBRIGATÓRIO se novo produto',
        'Opcional',
        'Opcional',
        'Opcional',
        'Opcional',
        'Opcional (padrão 1)',
        'Opcional',
        'Opcional',
        'Opcional',
        'OBRIGATÓRIO',
        'OBRIGATÓRIO',
        'Calculado automaticamente'
      ],
    ];

    // Linhas de exemplo + linhas vazias para preenchimento
    const linhasVazias = [];
    for (let i = 0; i < 25; i++) {
      linhasVazias.push(new Array(21).fill(''));
    }

    const pedidoData = [...pedidoHeader, ...linhasVazias];

    const wsPedido = XLSX.utils.aoa_to_sheet(pedidoData);
    wsPedido['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 22 },
      { wch: 20 }, { wch: 18 }, { wch: 15 }
    ];

    // ─── ABA 2: PRODUTOS CADASTRADOS (referência) ───────────────────────────
    const produtosHeader = [
      [
        'id', 'codigo_interno', 'codigo_barras',
        'campo_hierarquico_1', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5',
        'nome', 'marca', 'tipo',
        'categoria_id', 'categoria_nome',
        'area_id', 'area_codigo',
        'tags',
        'valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao',
        'custo_outros_padrao', 'desconto_compra_padrao',
        'preco_venda_padrao', 'preco_venda_tipo', 'preco_venda_percentual', 'preco_custo_calculado',
        'fornecedor_padrao_id', 'fornecedor_padrao_codigo',
        'dimensoes_cm', 'volume_cm3', 'peso_kg',
        'tempo_reposicao_dias',
        'estoque_atual', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'estoque_avariado',
        'unidade_principal', 'unidades_por_pacote',
        'controla_serial', 'controla_lote', 'controla_validade',
        'ativo'
      ]
    ];

    const produtosRows = produtos.map(p => [
      p.id || '',
      p.codigo_interno || '',
      p.codigo_barras || '',
      p.campo_hierarquico_1 || '',
      p.campo_hierarquico_2 || '',
      p.campo_hierarquico_3 || '',
      p.campo_hierarquico_4 || '',
      p.campo_hierarquico_5 || '',
      p.nome || '',
      p.marca || '',
      p.tipo || '',
      p.categoria_id || '',
      p.categoria_nome || '',
      p.area_id || '',
      p.area_codigo || '',
      Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
      p.valor_compra ?? 0,
      p.custo_frete_padrao ?? 0,
      p.custo_imposto1_padrao ?? 0,
      p.custo_imposto2_padrao ?? 0,
      p.custo_outros_padrao ?? 0,
      p.desconto_compra_padrao ?? 0,
      p.preco_venda_padrao ?? 0,
      p.preco_venda_tipo || '',
      p.preco_venda_percentual ?? 0,
      p.preco_custo_calculado ?? 0,
      p.fornecedor_padrao_id || '',
      p.fornecedor_padrao_codigo || '',
      p.dimensoes_cm || '',
      p.volume_cm3 ?? '',
      p.peso_kg ?? '',
      p.tempo_reposicao_dias ?? '',
      p.estoque_atual ?? 0,
      p.estoque_minimo ?? 0,
      p.estoque_ideal ?? 0,
      p.estoque_maximo ?? 0,
      p.estoque_avariado ?? 0,
      p.unidade_principal || 'UN',
      p.unidades_por_pacote ?? 1,
      p.controla_serial ? 'Sim' : 'Não',
      p.controla_lote ? 'Sim' : 'Não',
      p.controla_validade ? 'Sim' : 'Não',
      p.ativo !== false ? 'Sim' : 'Não',
    ]);

    const wsProdutos = XLSX.utils.aoa_to_sheet([...produtosHeader, ...produtosRows]);
    wsProdutos['!cols'] = produtosHeader[0].map(() => ({ wch: 22 }));

    // ─── ABA 3: FORNECEDORES CADASTRADOS (referência) ───────────────────────
    const fornsHeader = [
      [
        'id', 'codigo_interno', 'nome', 'cpf_cnpj', 'email', 'telefone',
        'endereco', 'bairro', 'cidade', 'estado', 'cep',
        'tipo', 'perfil', 'data_nascimento', 'observacoes', 'ativo'
      ]
    ];

    const fornsRows = fornecedores.map(f => [
      f.id || '',
      f.codigo_interno || '',
      f.nome || '',
      f.cpf_cnpj || '',
      f.email || '',
      f.telefone || '',
      f.endereco || '',
      f.bairro || '',
      f.cidade || '',
      f.estado || '',
      f.cep || '',
      f.tipo || '',
      f.perfil || '',
      f.data_nascimento || '',
      f.observacoes || '',
      f.ativo !== false ? 'Sim' : 'Não',
    ]);

    const wsFornecedores = XLSX.utils.aoa_to_sheet([...fornsHeader, ...fornsRows]);
    wsFornecedores['!cols'] = fornsHeader[0].map(() => ({ wch: 22 }));

    // ─── MONTAR WORKBOOK ─────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPedido, 'Pedido');
    XLSX.utils.book_append_sheet(wb, wsProdutos, 'Produtos Cadastrados');
    XLSX.utils.book_append_sheet(wb, wsFornecedores, 'Fornecedores Cadastrados');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const base64Content = encodeBase64(excelBuffer);

    return Response.json({
      file_content: base64Content,
      filename: `template_pedido_compra_${new Date().toISOString().split('T')[0]}.xlsx`
    });
  } catch (error) {
    console.error('Erro ao gerar template:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});