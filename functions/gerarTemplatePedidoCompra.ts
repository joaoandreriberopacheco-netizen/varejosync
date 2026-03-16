import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Helpers ───────────────────────────────────────────────────────────────────
function colLetter(index) {
  let result = '';
  while (index > 0) {
    index--;
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26);
  }
  return result;
}

// Cor de cabeçalho padrão (igual ao template de produtos)
const HEADER_BG   = { argb: 'FF1F2937' };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const EDIT_BG     = { argb: 'FFF9FAFB' };   // editável — cinza claríssimo
const LOCK_BG     = { argb: 'FFE5E7EB' };   // somente-leitura — cinza médio
const CALC_BG     = { argb: 'FFE0F2FE' };   // calculado — azul gelo
const NEW_BG      = { argb: 'FFF0FDF4' };   // linha nova — verde gelo (condicional)
const SECTION_BG  = { argb: 'FF111827' };   // seção / titulo aba pedido

// ── Configuração das colunas dos produtos (aba 2) ─────────────────────────────
const COLS_PRODUTOS = [
  { key: 'id',                     label: 'ID (não editar)',         editavel: false, width: 28, tipo: 'string' },
  { key: 'codigo_interno',         label: 'Cód. Interno',            editavel: false, width: 14, tipo: 'string' },
  { key: 'nome',                   label: 'Nome Completo',           editavel: false, width: 50, tipo: 'string', calculado: true },
  { key: 'campo_hierarquico_1',    label: 'Nível 1 (*)',             editavel: true,  width: 28, tipo: 'string' },
  { key: 'campo_hierarquico_2',    label: 'Nível 2',                 editavel: true,  width: 20, tipo: 'string' },
  { key: 'campo_hierarquico_3',    label: 'Nível 3',                 editavel: true,  width: 18, tipo: 'string' },
  { key: 'campo_hierarquico_4',    label: 'Nível 4',                 editavel: true,  width: 18, tipo: 'string' },
  { key: 'campo_hierarquico_5',    label: 'Nível 5',                 editavel: true,  width: 18, tipo: 'string' },
  { key: 'codigo_barras',          label: 'Cód. Barras',             editavel: true,  width: 18, tipo: 'string' },
  { key: 'marca',                  label: 'Marca',                   editavel: true,  width: 16, tipo: 'string' },
  { key: 'tipo',                   label: 'Tipo',                    editavel: true,  width: 12, tipo: 'string', enum: ['Produto','Serviço'] },
  { key: 'abcd',                   label: 'Curva ABCD',              editavel: true,  width: 12, tipo: 'string', enum: ['A','B','C','D'] },
  { key: 'categoria_nome',         label: 'Categoria',               editavel: true,  width: 20, tipo: 'string' },
  { key: 'area_codigo',            label: 'Área',                    editavel: true,  width: 14, tipo: 'string' },
  { key: 'valor_compra',           label: 'Valor Compra (R$)',       editavel: true,  width: 18, tipo: 'numero' },
  { key: 'custo_frete_padrao',     label: 'Frete Padrão (R$)',       editavel: true,  width: 18, tipo: 'numero' },
  { key: 'custo_imposto1_padrao',  label: 'Imposto 1',               editavel: true,  width: 14, tipo: 'numero' },
  { key: 'custo_imposto2_padrao',  label: 'Imposto 2',               editavel: true,  width: 14, tipo: 'numero' },
  { key: 'desconto_compra_padrao', label: 'Desconto Compra',         editavel: true,  width: 16, tipo: 'numero' },
  { key: 'custo_total_calculado',  label: 'Custo Total Calculado',   editavel: false, width: 22, tipo: 'numero', calculado: true },
  { key: 'preco_venda_padrao',     label: 'Preço Venda (*)',         editavel: true,  width: 18, tipo: 'numero' },
  { key: 'unidade_principal',      label: 'Unidade',                 editavel: true,  width: 12, tipo: 'string' },
  { key: 'unidades_por_pacote',    label: 'Qtd/Pacote',              editavel: true,  width: 14, tipo: 'numero' },
  { key: 'estoque_minimo',         label: 'Estoque Mínimo',          editavel: true,  width: 16, tipo: 'numero' },
  { key: 'estoque_ideal',          label: 'Estoque Ideal',           editavel: true,  width: 16, tipo: 'numero' },
  { key: 'estoque_maximo',         label: 'Estoque Máximo',          editavel: true,  width: 16, tipo: 'numero' },
  { key: 'tempo_reposicao_dias',   label: 'Tempo Reposição (dias)',  editavel: true,  width: 22, tipo: 'numero' },
  { key: 'peso_kg',                label: 'Peso (kg)',               editavel: true,  width: 12, tipo: 'numero' },
  { key: 'dimensoes_cm',           label: 'Dimensões (cm)',          editavel: true,  width: 18, tipo: 'string' },
  { key: 'ativo',                  label: 'Ativo (SIM/NÃO)',         editavel: true,  width: 14, tipo: 'boolean' },
];

// ── Configuração das colunas dos fornecedores (aba 3) ─────────────────────────
const COLS_FORN = [
  { key: 'id',               label: 'ID (não editar)',  editavel: false, width: 28, tipo: 'string' },
  { key: 'codigo_interno',   label: 'Cód. Interno',     editavel: false, width: 14, tipo: 'string' },
  { key: 'nome',             label: 'Nome (*)',          editavel: true,  width: 36, tipo: 'string' },
  { key: 'cpf_cnpj',         label: 'CPF/CNPJ',         editavel: true,  width: 18, tipo: 'string' },
  { key: 'email',            label: 'E-mail',            editavel: true,  width: 26, tipo: 'string' },
  { key: 'telefone',         label: 'Telefone',          editavel: true,  width: 16, tipo: 'string' },
  { key: 'endereco',         label: 'Endereço',          editavel: true,  width: 32, tipo: 'string' },
  { key: 'bairro',           label: 'Bairro',            editavel: true,  width: 18, tipo: 'string' },
  { key: 'cidade',           label: 'Cidade',            editavel: true,  width: 18, tipo: 'string' },
  { key: 'estado',           label: 'Estado (UF)',       editavel: true,  width: 12, tipo: 'string' },
  { key: 'cep',              label: 'CEP',               editavel: true,  width: 12, tipo: 'string' },
  { key: 'tipo',             label: 'Tipo',              editavel: true,  width: 14, tipo: 'string', enum: ['Cliente','Fornecedor','Ambos'] },
  { key: 'perfil',           label: 'Perfil',            editavel: true,  width: 22, tipo: 'string', enum: ['Pessoa Física','Profissional/Instalador','Empresa/Loja','Construtora/Obra'] },
  { key: 'observacoes',      label: 'Observações',       editavel: true,  width: 30, tipo: 'string' },
  { key: 'ativo',            label: 'Ativo (SIM/NÃO)',   editavel: true,  width: 14, tipo: 'boolean' },
];

// ── Colunas da aba Pedido ─────────────────────────────────────────────────────
// Linha 1 = título, Linha 2 = cabeçalho campos fornecedor, Linha 3+ = dados forn
// Separador, depois cabeçalho itens, depois itens

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ExcelJS = (await import('npm:exceljs@4.4.0')).default;

    // Buscar dados reais
    const [produtos, fornecedores] = await Promise.all([
      base44.asServiceRole.entities.Produto.list(),
      base44.asServiceRole.entities.Terceiro.filter({ tipo: ['Fornecedor', 'Ambos'] }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'VarejoSync';

    // ══════════════════════════════════════════════════════════════════════════
    // ABA 1 — PEDIDO
    // ══════════════════════════════════════════════════════════════════════════
    const wsPedido = wb.addWorksheet('Pedido', {
      views: [{ state: 'frozen', ySplit: 14 }],
    });

    // Larguras das colunas da aba Pedido
    // Col A: label, Col B: valor/ID, Col C: nome produto (lookup), Cols D+: extras
    const PEDIDO_COLS = [
      { header: 'Campo',                    key: 'campo',      width: 28,  editavel: false },
      { header: 'ID / Valor',               key: 'valor',      width: 32,  editavel: true  },
      { header: 'Nome / Descrição',         key: 'nome',       width: 50,  editavel: false, calculado: true },
      { header: 'Quantidade Pedido',        key: 'qtd',        width: 20,  editavel: true  },
      { header: 'Custo Unitário (R$)',      key: 'custo',      width: 22,  editavel: true  },
      { header: 'Total (R$)',               key: 'total',      width: 18,  editavel: false, calculado: true },
    ];

    wsPedido.columns = PEDIDO_COLS.map(c => ({ header: c.header, key: c.key, width: c.width }));

    // ── Linha 1: título da aba ────────────────────────────────────────────────
    const titleRow = wsPedido.getRow(1);
    titleRow.getCell(1).value = '=== PEDIDO DE COMPRA ===';
    titleRow.getCell(1).font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: SECTION_BG };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    wsPedido.mergeCells('A1:F1');
    titleRow.height = 26;
    titleRow.eachCell(c => { c.protection = { locked: true }; });

    // ── Linhas 2-12: campos do fornecedor / cabeçalho ─────────────────────────
    const FORN_FIELDS = [
      { campo: 'Fornecedor ID',          instrucao: 'Cole o ID da aba "Fornecedores Cadastrados" — obrigatório' },
      { campo: 'Data Prevista Entrega',  instrucao: 'Formato: AAAA-MM-DD — opcional' },
      { campo: 'Observações do Pedido',  instrucao: 'Texto livre — opcional' },
    ];

    // Cabeçalho das linhas de metadados
    const metaHeaderRow = wsPedido.getRow(2);
    metaHeaderRow.getCell(1).value = 'CAMPO';
    metaHeaderRow.getCell(2).value = 'VALOR';
    metaHeaderRow.getCell(3).value = 'INSTRUÇÃO';
    metaHeaderRow.eachCell(c => {
      c.font = HEADER_FONT;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: HEADER_BG };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      c.protection = { locked: true };
    });
    metaHeaderRow.height = 20;

    FORN_FIELDS.forEach((f, i) => {
      const r = wsPedido.getRow(3 + i);
      r.getCell(1).value = f.campo;
      r.getCell(1).font  = { bold: true, size: 10, color: { argb: 'FF374151' } };
      r.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: LOCK_BG };
      r.getCell(1).protection = { locked: true };

      r.getCell(2).value = '';
      r.getCell(2).fill  = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
      r.getCell(2).protection = { locked: false };

      r.getCell(3).value = f.instrucao;
      r.getCell(3).font  = { italic: true, color: { argb: 'FF6B7280' }, size: 9 };
      r.getCell(3).fill  = { type: 'pattern', pattern: 'solid', fgColor: LOCK_BG };
      r.getCell(3).protection = { locked: true };
      r.height = 18;
    });

    // Linhas 6-13: espaço vazio reservado
    for (let rn = 6; rn <= 12; rn++) {
      const r = wsPedido.getRow(rn);
      for (let cn = 1; cn <= 6; cn++) {
        r.getCell(cn).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        r.getCell(cn).protection = { locked: true };
      }
      r.height = 6;
    }

    // ── Linha 13: título seção itens ──────────────────────────────────────────
    const itensTitleRow = wsPedido.getRow(13);
    itensTitleRow.getCell(1).value = '=== ITENS DO PEDIDO ===';
    itensTitleRow.getCell(1).font  = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    itensTitleRow.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: SECTION_BG };
    itensTitleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    wsPedido.mergeCells('A13:F13');
    itensTitleRow.height = 22;
    itensTitleRow.eachCell(c => { c.protection = { locked: true }; });

    // ── Linha 14: cabeçalho das colunas de itens ──────────────────────────────
    const itemHeaderRow = wsPedido.getRow(14);
    PEDIDO_COLS.forEach((col, i) => {
      const cell = itemHeaderRow.getCell(i + 1);
      cell.value = col.header;
      cell.font  = HEADER_FONT;
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: HEADER_BG };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.protection = { locked: true };
    });
    itemHeaderRow.height = 22;

    // Lista de nomes dos produtos para data validation (busca incremental)
    // O Excel permite até 255 chars na fórmula de lista — para grandes bases usamos aba auxiliar
    // Usaremos referência à aba "Produtos Cadastrados", coluna C (Nome Completo)
    const MAX_ROWS_PEDIDO = 500;
    const nomesProdutosRef = `'Produtos Cadastrados'!$C$2:$C$${1 + produtos.length + 500}`;

    for (let rn = 15; rn <= 14 + MAX_ROWS_PEDIDO; rn++) {
      const row = wsPedido.getRow(rn);

      // Col A: ID do produto — editável, lista de IDs (coluna A da aba produtos)
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
      row.getCell(1).protection = { locked: false };

      // Col B: Nome — busca incremental via data validation apontando para aba Produtos col C
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
      row.getCell(2).protection = { locked: false };

      // Col C: Nome resultado (calculado pelo VLOOKUP) — somente leitura
      // Fórmula: se B preenchido, busca ID na aba produtos (col C vs col A)
      row.getCell(3).value = {
        formula: `=IF(B${rn}="","",IFERROR(VLOOKUP(B${rn},'Produtos Cadastrados'!$C:$C,1,0),B${rn}))`,
        result: '',
      };
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
      row.getCell(3).font = { italic: true, color: { argb: 'FF0369A1' } };
      row.getCell(3).protection = { locked: true };

      // Col D: Quantidade
      row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
      row.getCell(4).protection = { locked: false };
      row.getCell(4).numFmt = '#,##0.00';

      // Col E: Custo Unitário
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
      row.getCell(5).protection = { locked: false };
      row.getCell(5).numFmt = '#,##0.00';

      // Col F: Total = D * E
      row.getCell(6).value = {
        formula: `=IF(D${rn}="","",D${rn}*E${rn})`,
        result: 0,
      };
      row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
      row.getCell(6).font = { italic: true, color: { argb: 'FF0369A1' } };
      row.getCell(6).numFmt = '#,##0.00';
      row.getCell(6).protection = { locked: true };

      row.commit();
    }

    // Data validation: col B (Nome do Produto) busca incremental lista aba Produtos
    wsPedido.dataValidations.add(`B15:B${14 + MAX_ROWS_PEDIDO}`, {
      type: 'list',
      allowBlank: true,
      showDropDown: false,
      showErrorMessage: true,
      errorTitle: 'Produto não encontrado',
      error: 'Digite o nome do produto conforme listado em "Produtos Cadastrados".',
      formulae: [nomesProdutosRef],
    });

    // Data validation: col A (ID do produto) — lista de IDs da aba produtos
    wsPedido.dataValidations.add(`A15:A${14 + MAX_ROWS_PEDIDO}`, {
      type: 'list',
      allowBlank: true,
      showDropDown: false,
      formulae: [`'Produtos Cadastrados'!$A$2:$A$${1 + produtos.length + 500}`],
    });

    // Formatação condicional: linha inteira em verde gelo se col B preenchida
    wsPedido.addConditionalFormatting({
      ref: `A15:F${14 + MAX_ROWS_PEDIDO}`,
      rules: [{
        type: 'expression',
        priority: 1,
        formulae: [`$B15<>""`],
        style: {
          font: { color: { argb: 'FF166534' } },
          fill: { type: 'pattern', pattern: 'solid', bgColor: NEW_BG },
        },
      }],
    });

    await wsPedido.protect('', {
      insertColumns: false,
      deleteRows: true,
      formatCells: false,
      selectLockedCells: true,
      selectUnlockedCells: true,
    });

    wsPedido.autoFilter = { from: 'A14', to: 'F14' };

    // ══════════════════════════════════════════════════════════════════════════
    // ABA 2 — PRODUTOS CADASTRADOS
    // ══════════════════════════════════════════════════════════════════════════
    const wsProd = wb.addWorksheet('Produtos Cadastrados', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    wsProd.columns = COLS_PRODUTOS.map(c => ({ header: c.label, key: c.key, width: c.width }));

    const prodHeaderRow = wsProd.getRow(1);
    prodHeaderRow.eachCell(cell => {
      cell.font = HEADER_FONT;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: HEADER_BG };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.protection = { locked: true };
    });
    prodHeaderRow.height = 24;

    // Índices auxiliares para fórmulas
    const idxValorCompra  = COLS_PRODUTOS.findIndex(c => c.key === 'valor_compra') + 1;
    const idxFrete        = COLS_PRODUTOS.findIndex(c => c.key === 'custo_frete_padrao') + 1;
    const idxImposto1     = COLS_PRODUTOS.findIndex(c => c.key === 'custo_imposto1_padrao') + 1;
    const idxImposto2     = COLS_PRODUTOS.findIndex(c => c.key === 'custo_imposto2_padrao') + 1;
    const idxDesconto     = COLS_PRODUTOS.findIndex(c => c.key === 'desconto_compra_padrao') + 1;
    const idxCustoCalc    = COLS_PRODUTOS.findIndex(c => c.key === 'custo_total_calculado') + 1;
    const idxPrecoVenda   = COLS_PRODUTOS.findIndex(c => c.key === 'preco_venda_padrao') + 1;
    const idxIdProd       = COLS_PRODUTOS.findIndex(c => c.key === 'id') + 1;
    const idxNome         = COLS_PRODUTOS.findIndex(c => c.key === 'nome') + 1;
    const idxH1           = COLS_PRODUTOS.findIndex(c => c.key === 'campo_hierarquico_1') + 1;
    const idxH2           = COLS_PRODUTOS.findIndex(c => c.key === 'campo_hierarquico_2') + 1;
    const idxH3           = COLS_PRODUTOS.findIndex(c => c.key === 'campo_hierarquico_3') + 1;
    const idxH4           = COLS_PRODUTOS.findIndex(c => c.key === 'campo_hierarquico_4') + 1;
    const idxH5           = COLS_PRODUTOS.findIndex(c => c.key === 'campo_hierarquico_5') + 1;

    const letVC = colLetter(idxValorCompra);
    const letFR = colLetter(idxFrete);
    const letI1 = colLetter(idxImposto1);
    const letI2 = colLetter(idxImposto2);
    const letDC = colLetter(idxDesconto);
    const letCC = colLetter(idxCustoCalc);
    const letPV = colLetter(idxPrecoVenda);
    const letId = colLetter(idxIdProd);
    const letNm = colLetter(idxNome);
    const letH1 = colLetter(idxH1);
    const letH2 = colLetter(idxH2);
    const letH3 = colLetter(idxH3);
    const letH4 = colLetter(idxH4);
    const letH5 = colLetter(idxH5);
    const lastProdCol = colLetter(COLS_PRODUTOS.length);
    const EXTRA_BLANK = 1000;
    const maxProdRows = 1 + produtos.length + EXTRA_BLANK;

    // Data validations
    COLS_PRODUTOS.forEach((col, idx) => {
      const letter = colLetter(idx + 1);
      const range  = `${letter}2:${letter}${maxProdRows}`;
      if (col.tipo === 'numero') {
        wsProd.dataValidations.add(range, {
          type: 'decimal', operator: 'greaterThanOrEqual',
          showErrorMessage: true, errorTitle: 'Inválido',
          error: `"${col.label}" deve ser número.`, formulae: [0],
        });
      } else if (col.tipo === 'boolean') {
        wsProd.dataValidations.add(range, {
          type: 'list', allowBlank: true,
          formulae: ['"SIM,NÃO"'],
        });
      } else if (col.enum) {
        wsProd.dataValidations.add(range, {
          type: 'list', allowBlank: true,
          showErrorMessage: true, errorTitle: 'Inválido',
          error: `Valores: ${col.enum.join(', ')}`,
          formulae: [`"${col.enum.join(',')}"`],
        });
      }
    });

    // Linhas de dados
    produtos.forEach((p, i) => {
      const rn = i + 2;
      const custoCalc = (p.valor_compra || 0) + (p.custo_frete_padrao || 0) +
                        (p.custo_imposto1_padrao || 0) + (p.custo_imposto2_padrao || 0) -
                        (p.desconto_compra_padrao || 0);

      const rowData = {};
      COLS_PRODUTOS.forEach(col => {
        if (col.key === 'custo_total_calculado') {
          rowData[col.key] = {
            formula: `=${letVC}${rn}+${letFR}${rn}+${letI1}${rn}+${letI2}${rn}-${letDC}${rn}`,
            result: custoCalc,
          };
        } else if (col.key === 'nome') {
          const nomePartes = [p.campo_hierarquico_1, p.campo_hierarquico_2, p.campo_hierarquico_3,
                              p.campo_hierarquico_4, p.campo_hierarquico_5].filter(Boolean).join(' ');
          rowData[col.key] = {
            formula: `=TRIM(CONCATENATE(${letH1}${rn},IF(${letH2}${rn}<>""," "&${letH2}${rn},""),IF(${letH3}${rn}<>""," "&${letH3}${rn},""),IF(${letH4}${rn}<>""," "&${letH4}${rn},""),IF(${letH5}${rn}<>""," "&${letH5}${rn},"")))`,
            result: nomePartes,
          };
        } else if (col.tipo === 'boolean') {
          rowData[col.key] = p[col.key] !== false ? 'SIM' : 'NÃO';
        } else {
          rowData[col.key] = p[col.key] ?? '';
        }
      });

      const row = wsProd.addRow(rowData);
      row.eachCell({ includeEmpty: true }, (cell, cn) => {
        const cfg = COLS_PRODUTOS[cn - 1];
        const isLocked = !cfg || !cfg.editavel;
        cell.protection = { locked: isLocked };
        if (cfg?.calculado) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
          cell.font = { italic: true, color: { argb: 'FF0369A1' } };
        } else if (cfg?.editavel) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: LOCK_BG };
        }
        if (cfg?.tipo === 'numero') cell.numFmt = '#,##0.00';
      });
    });

    // Linhas em branco para novos produtos
    const firstBlank = produtos.length + 2;
    for (let r = firstBlank; r <= maxProdRows; r++) {
      const row = wsProd.getRow(r);
      COLS_PRODUTOS.forEach((col, idx) => {
        const cell = row.getCell(idx + 1);
        if (col.editavel) {
          cell.protection = { locked: false };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
        } else {
          cell.protection = { locked: true };
        }
        if (col.key === 'nome' && col.calculado) {
          cell.value = {
            formula: `=TRIM(CONCATENATE(${letH1}${r},IF(${letH2}${r}<>""," "&${letH2}${r},""),IF(${letH3}${r}<>""," "&${letH3}${r},""),IF(${letH4}${r}<>""," "&${letH4}${r},""),IF(${letH5}${r}<>""," "&${letH5}${r},"")))`,
            result: '',
          };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
          cell.font = { italic: true, color: { argb: 'FF0369A1' } };
          cell.protection = { locked: true };
        }
        if (col.key === 'custo_total_calculado') {
          cell.value = {
            formula: `=${letVC}${r}+${letFR}${r}+${letI1}${r}+${letI2}${r}-${letDC}${r}`,
            result: 0,
          };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
          cell.font = { italic: true, color: { argb: 'FF0369A1' } };
          cell.protection = { locked: true };
        }
      });
      row.commit();
    }

    // Formatação condicional
    wsProd.addConditionalFormatting({
      ref: `${letPV}2:${letPV}${maxProdRows}`,
      rules: [{
        type: 'expression', priority: 1,
        formulae: [`${letPV}2<${letCC}2`],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFCA5A5' } }, font: { color: { argb: 'FF991B1B' }, bold: true } },
      }],
    });
    wsProd.addConditionalFormatting({
      ref: `A2:${lastProdCol}${maxProdRows}`,
      rules: [{
        type: 'expression', priority: 2,
        formulae: [`$${letId}2=""`],
        style: { font: { color: { argb: 'FF166534' } }, fill: { type: 'pattern', pattern: 'solid', bgColor: NEW_BG } },
      }],
    });

    await wsProd.protect('', {
      insertColumns: true, deleteRows: true, formatCells: true,
      selectLockedCells: true, selectUnlockedCells: true,
    });
    wsProd.autoFilter = { from: 'A1', to: `${lastProdCol}1` };

    // ══════════════════════════════════════════════════════════════════════════
    // ABA 3 — FORNECEDORES CADASTRADOS
    // ══════════════════════════════════════════════════════════════════════════
    const wsForns = wb.addWorksheet('Fornecedores Cadastrados', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    wsForns.columns = COLS_FORN.map(c => ({ header: c.label, key: c.key, width: c.width }));

    const fornHeaderRow = wsForns.getRow(1);
    fornHeaderRow.eachCell(cell => {
      cell.font = HEADER_FONT;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: HEADER_BG };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.protection = { locked: true };
    });
    fornHeaderRow.height = 24;

    const letIdForn = colLetter(COLS_FORN.findIndex(c => c.key === 'id') + 1);
    const lastFornCol = colLetter(COLS_FORN.length);
    const EXTRA_BLANK_FORN = 500;
    const maxFornRows = 1 + fornecedores.length + EXTRA_BLANK_FORN;

    COLS_FORN.forEach((col, idx) => {
      const letter = colLetter(idx + 1);
      const range  = `${letter}2:${letter}${maxFornRows}`;
      if (col.tipo === 'boolean') {
        wsForns.dataValidations.add(range, { type: 'list', allowBlank: true, formulae: ['"SIM,NÃO"'] });
      } else if (col.enum) {
        wsForns.dataValidations.add(range, {
          type: 'list', allowBlank: true,
          showErrorMessage: true, errorTitle: 'Inválido',
          error: `Valores: ${col.enum.join(', ')}`,
          formulae: [`"${col.enum.join(',')}"`],
        });
      }
    });

    fornecedores.forEach((f) => {
      const rowData = {};
      COLS_FORN.forEach(col => {
        if (col.tipo === 'boolean') rowData[col.key] = f[col.key] !== false ? 'SIM' : 'NÃO';
        else rowData[col.key] = f[col.key] ?? '';
      });
      const row = wsForns.addRow(rowData);
      row.eachCell({ includeEmpty: true }, (cell, cn) => {
        const cfg = COLS_FORN[cn - 1];
        cell.protection = { locked: !cfg?.editavel };
        if (cfg?.editavel) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
        else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: LOCK_BG };
      });
    });

    const firstBlankForn = fornecedores.length + 2;
    for (let r = firstBlankForn; r <= maxFornRows; r++) {
      const row = wsForns.getRow(r);
      COLS_FORN.forEach((col, idx) => {
        const cell = row.getCell(idx + 1);
        if (col.editavel) {
          cell.protection = { locked: false };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
        } else {
          cell.protection = { locked: true };
        }
      });
      row.commit();
    }

    // Condicional: nova linha (ID vazio) em verde
    wsForns.addConditionalFormatting({
      ref: `A2:${lastFornCol}${maxFornRows}`,
      rules: [{
        type: 'expression', priority: 1,
        formulae: [`$${letIdForn}2=""`],
        style: { font: { color: { argb: 'FF166534' } }, fill: { type: 'pattern', pattern: 'solid', bgColor: NEW_BG } },
      }],
    });

    await wsForns.protect('', {
      insertColumns: true, deleteRows: true, formatCells: true,
      selectLockedCells: true, selectUnlockedCells: true,
    });
    wsForns.autoFilter = { from: 'A1', to: `${lastFornCol}1` };

    // ── Gerar buffer e retornar ───────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    return Response.json({
      file_content: base64,
      filename: `template_pedido_compra_${new Date().toISOString().split('T')[0]}.xlsx`,
    });
  } catch (error) {
    console.error('Erro ao gerar template:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});