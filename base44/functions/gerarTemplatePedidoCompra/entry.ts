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

const HEADER_BG   = { argb: 'FF1F2937' };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const EDIT_BG     = { argb: 'FFF9FAFB' };
const LOCK_BG     = { argb: 'FFE5E7EB' };
const CALC_BG     = { argb: 'FFE0F2FE' };
const NEW_BG      = { argb: 'FFF0FDF4' };
const SECTION_BG  = { argb: 'FF111827' };

// ── Aba 1 — PEDIDO ────────────────────────────────────────────────────────────
// Colunas: A=ID(calc) | B=Nome/Desc(edit,dropdown) | C=Qtd(edit) |
//          D=ValorCompra(edit livre) | E=Desconto%(edit) | F=ValorLíq(calc) | G=Total(calc)
const PEDIDO_COLS = [
  { header: 'ID do Produto',          key: 'id',      width: 28, editavel: false, calculado: true  },
  { header: 'Nome / Descrição',       key: 'nome',    width: 52, editavel: true,  calculado: false },
  { header: 'Quantidade',             key: 'qtd',     width: 16, editavel: true,  calculado: false },
  { header: 'Valor de Compra (R$)',   key: 'custo',   width: 20, editavel: true,  calculado: false },
  { header: 'Desconto (%)',           key: 'desc',    width: 14, editavel: true,  calculado: false },
  { header: 'Valor Líquido (R$)',     key: 'liq',     width: 20, editavel: false, calculado: true  },
  { header: 'Total (R$)',             key: 'total',   width: 18, editavel: false, calculado: true  },
];
const PEDIDO_COL_COUNT = PEDIDO_COLS.length; // 7

// ── Aba 2 — PRODUTOS CADASTRADOS ─────────────────────────────────────────────
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
  // ── Bloco custo ──────────────────────────────────────────────────────────
  { key: 'valor_compra',           label: 'Valor Compra (R$)',       editavel: true,  width: 18, tipo: 'numero' },
  { key: 'casas_decimais',         label: 'Casas Decimais',          editavel: true,  width: 14, tipo: 'numero' }, // NOVO
  { key: 'desconto_perc',          label: 'Desconto (%)',            editavel: true,  width: 14, tipo: 'numero' }, // NOVO: 5=desc, -5=acresc
  { key: 'valor_compra_liq',       label: 'Valor Liq. (R$)',         editavel: false, width: 16, tipo: 'numero', calculado: true }, // NOVO calc
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
  // ── Detecção de alteração ────────────────────────────────────────────────
  { key: '_hash_orig',             label: 'HASH_ORIG',               editavel: false, width: 6,  tipo: 'string', hidden: true },
  { key: 'alterado',               label: 'Alterado?',               editavel: false, width: 12, tipo: 'string', calculado: true },
];

// ── Aba 3 — FORNECEDORES ─────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ExcelJS = (await import('npm:exceljs@4.4.0')).default;

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

    wsPedido.columns = PEDIDO_COLS.map(c => ({ header: c.header, key: c.key, width: c.width }));

    const lastPedidoCol = colLetter(PEDIDO_COL_COUNT); // G

    // Linha 1: título
    const titleRow = wsPedido.getRow(1);
    titleRow.getCell(1).value = '=== PEDIDO DE COMPRA ===';
    titleRow.getCell(1).font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: SECTION_BG };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    wsPedido.mergeCells(`A1:${lastPedidoCol}1`);
    titleRow.height = 26;
    titleRow.eachCell(c => { c.protection = { locked: true }; });

    // Linhas 2-5: campos do fornecedor
    const FORN_FIELDS = [
      { campo: 'Fornecedor ID',          instrucao: 'Cole o ID da aba "Fornecedores Cadastrados" — obrigatório' },
      { campo: 'Data Prevista Entrega',  instrucao: 'Formato: AAAA-MM-DD — opcional' },
      { campo: 'Observações do Pedido',  instrucao: 'Texto livre — opcional' },
    ];

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

    // Linhas 6-12: espaço vazio
    for (let rn = 6; rn <= 12; rn++) {
      const r = wsPedido.getRow(rn);
      for (let cn = 1; cn <= PEDIDO_COL_COUNT; cn++) {
        r.getCell(cn).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        r.getCell(cn).protection = { locked: true };
      }
      r.height = 6;
    }

    // Linha 13: título seção itens
    const itensTitleRow = wsPedido.getRow(13);
    itensTitleRow.getCell(1).value = '=== ITENS DO PEDIDO ===';
    itensTitleRow.getCell(1).font  = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    itensTitleRow.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: SECTION_BG };
    itensTitleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    wsPedido.mergeCells(`A13:${lastPedidoCol}13`);
    itensTitleRow.height = 22;
    itensTitleRow.eachCell(c => { c.protection = { locked: true }; });

    // Linha 14: cabeçalho
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

    // Linha de legenda logo abaixo do cabeçalho
    const legendRow = wsPedido.getRow(14);
    // (cabeçalho já escrito acima — apenas adicionamos tooltips via comentário)

    // Calcular letras de colunas do Produtos para VLOOKUP
    // Aba Pedido: A=ID(calc) B=Nome(edit) C=Qtd D=Custo(edit) E=Desc F=Liq G=Total
    const pIdxNome      = COLS_PRODUTOS.findIndex(c => c.key === 'nome') + 1;
    const pIdxId        = COLS_PRODUTOS.findIndex(c => c.key === 'id') + 1;
    const pIdxVC        = COLS_PRODUTOS.findIndex(c => c.key === 'valor_compra') + 1;
    const pLetNome      = colLetter(pIdxNome);
    const pLetId        = colLetter(pIdxId);

    const MAX_ROWS_PEDIDO = 500;

    for (let rn = 15; rn <= 14 + MAX_ROWS_PEDIDO; rn++) {
      const row = wsPedido.getRow(rn);

      // Col A: ID do Produto — INDEX/MATCH busca ID pelo nome selecionado em B
      row.getCell(1).value = {
        formula: `=IF(B${rn}="","",IFERROR(INDEX('Produtos Cadastrados'!$${pLetId}:$${pLetId},MATCH(B${rn},'Produtos Cadastrados'!$${pLetNome}:$${pLetNome},0)),"?"))`,
        result: '',
      };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
      row.getCell(1).font = { italic: true, color: { argb: 'FF0369A1' }, size: 9 };
      row.getCell(1).protection = { locked: true };

      // Col B: Nome / Descrição — editável, dropdown com nomes dos produtos
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
      row.getCell(2).protection = { locked: false };

      // Col C: Quantidade — editável
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
      row.getCell(3).protection = { locked: false };
      row.getCell(3).numFmt = '#,##0.##';

      // Col D: Valor de Compra — editável (livre, só número)
      row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
      row.getCell(4).protection = { locked: false };
      row.getCell(4).numFmt = '#,##0.00';

      // Col E: Desconto (%) — editável
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
      row.getCell(5).protection = { locked: false };
      row.getCell(5).numFmt = '0.00"%"';

      // Col F: Valor Líquido = D * (1 - E/100)
      row.getCell(6).value = {
        formula: `=IF(D${rn}="","",D${rn}*(1-E${rn}/100))`,
        result: 0,
      };
      row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
      row.getCell(6).font = { italic: true, color: { argb: 'FF0369A1' } };
      row.getCell(6).numFmt = '#,##0.00';
      row.getCell(6).protection = { locked: true };

      // Col G: Total = C * F
      row.getCell(7).value = {
        formula: `=IF(C${rn}="","",C${rn}*F${rn})`,
        result: 0,
      };
      row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
      row.getCell(7).font = { italic: true, color: { argb: 'FF0369A1' } };
      row.getCell(7).numFmt = '#,##0.00';
      row.getCell(7).protection = { locked: true };

      row.commit();
    }

    // Data validation: col B — dropdown com nomes dos produtos
    const nomesProdutosRef = "'Produtos Cadastrados'!$" + pLetNome + "$2:$" + pLetNome + '$' + (1 + produtos.length + 500);
    wsPedido.dataValidations.add('B15:B' + (14 + MAX_ROWS_PEDIDO), {
      type: 'list',
      allowBlank: true,
      showDropDown: false,
      showErrorMessage: false,
      formulae: [nomesProdutosRef],
    });

    // Data validation: col D — somente número
    wsPedido.dataValidations.add('D15:D' + (14 + MAX_ROWS_PEDIDO), {
      type: 'decimal', operator: 'greaterThanOrEqual',
      showErrorMessage: true, errorTitle: 'Inválido',
      error: 'Informe um valor numérico.', formulae: [0],
    });

    // Formatação condicional: linha em verde quando B preenchida
    wsPedido.addConditionalFormatting({
      ref: `A15:${lastPedidoCol}${14 + MAX_ROWS_PEDIDO}`,
      rules: [{
        type: 'expression', priority: 1,
        formulae: [`$B15<>""`],
        style: {
          font: { color: { argb: 'FF166534' } },
          fill: { type: 'pattern', pattern: 'solid', bgColor: NEW_BG },
        },
      }],
    });

    await wsPedido.protect('', {
      insertColumns: false, deleteRows: true, formatCells: false,
      selectLockedCells: true, selectUnlockedCells: true,
    });

    wsPedido.autoFilter = { from: 'A14', to: `${lastPedidoCol}14` };

    // ══════════════════════════════════════════════════════════════════════════
    // ABA 2 — PRODUTOS CADASTRADOS
    // ══════════════════════════════════════════════════════════════════════════
    const wsProd = wb.addWorksheet('Produtos Cadastrados', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    wsProd.columns = COLS_PRODUTOS.map(c => ({ header: c.label, key: c.key, width: c.width }));

    // Cabeçalho
    const prodHeaderRow = wsProd.getRow(1);
    prodHeaderRow.eachCell(cell => {
      cell.font = HEADER_FONT;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: HEADER_BG };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.protection = { locked: true };
    });
    prodHeaderRow.height = 24;

    // Índices e letras das colunas relevantes
    const idxValorCompra   = COLS_PRODUTOS.findIndex(c => c.key === 'valor_compra') + 1;
    const idxCasasDec      = COLS_PRODUTOS.findIndex(c => c.key === 'casas_decimais') + 1;
    const idxDescontoPer   = COLS_PRODUTOS.findIndex(c => c.key === 'desconto_perc') + 1;
    const idxValorLiq      = COLS_PRODUTOS.findIndex(c => c.key === 'valor_compra_liq') + 1;
    const idxFrete         = COLS_PRODUTOS.findIndex(c => c.key === 'custo_frete_padrao') + 1;
    const idxImposto1      = COLS_PRODUTOS.findIndex(c => c.key === 'custo_imposto1_padrao') + 1;
    const idxImposto2      = COLS_PRODUTOS.findIndex(c => c.key === 'custo_imposto2_padrao') + 1;
    const idxDesconto      = COLS_PRODUTOS.findIndex(c => c.key === 'desconto_compra_padrao') + 1;
    const idxCustoCalc     = COLS_PRODUTOS.findIndex(c => c.key === 'custo_total_calculado') + 1;
    const idxPrecoVenda    = COLS_PRODUTOS.findIndex(c => c.key === 'preco_venda_padrao') + 1;
    const idxIdProd        = COLS_PRODUTOS.findIndex(c => c.key === 'id') + 1;
    const idxNomeProd      = COLS_PRODUTOS.findIndex(c => c.key === 'nome') + 1;
    const idxH1            = COLS_PRODUTOS.findIndex(c => c.key === 'campo_hierarquico_1') + 1;
    const idxH2            = COLS_PRODUTOS.findIndex(c => c.key === 'campo_hierarquico_2') + 1;
    const idxH3            = COLS_PRODUTOS.findIndex(c => c.key === 'campo_hierarquico_3') + 1;
    const idxH4            = COLS_PRODUTOS.findIndex(c => c.key === 'campo_hierarquico_4') + 1;
    const idxH5            = COLS_PRODUTOS.findIndex(c => c.key === 'campo_hierarquico_5') + 1;
    const idxHashOrig      = COLS_PRODUTOS.findIndex(c => c.key === '_hash_orig') + 1;
    const idxAlterado      = COLS_PRODUTOS.findIndex(c => c.key === 'alterado') + 1;
    const idxUnidade       = COLS_PRODUTOS.findIndex(c => c.key === 'unidade_principal') + 1;

    const letVC   = colLetter(idxValorCompra);
    const letCD   = colLetter(idxCasasDec);
    const letDP   = colLetter(idxDescontoPer);
    const letVL   = colLetter(idxValorLiq);
    const letFR   = colLetter(idxFrete);
    const letI1   = colLetter(idxImposto1);
    const letI2   = colLetter(idxImposto2);
    const letDC   = colLetter(idxDesconto);
    const letCC   = colLetter(idxCustoCalc);
    const letPV   = colLetter(idxPrecoVenda);
    const letId   = colLetter(idxIdProd);
    const letNm   = colLetter(idxNomeProd);
    const letH1   = colLetter(idxH1);
    const letH2   = colLetter(idxH2);
    const letH3   = colLetter(idxH3);
    const letH4   = colLetter(idxH4);
    const letH5   = colLetter(idxH5);
    const letHO   = colLetter(idxHashOrig);
    const letAL   = colLetter(idxAlterado);
    const letUN   = colLetter(idxUnidade);
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
        wsProd.dataValidations.add(range, { type: 'list', allowBlank: true, formulae: ['"SIM,NÃO"'] });
      } else if (col.enum) {
        wsProd.dataValidations.add(range, {
          type: 'list', allowBlank: true,
          showErrorMessage: true, errorTitle: 'Inválido',
          error: `Valores: ${col.enum.join(', ')}`,
          formulae: [`"${col.enum.join(',')}"`],
        });
      }
    });

    // ── Normalização de valores para o hash ────────────────────────────────
    // Converte qualquer valor numérico para string com 2 casas decimais fixas
    // Trata núlos/vazios como 0, e strings com vírgula (pt-BR) => ponto
    const normNum = (v) => {
      if (v === null || v === undefined || v === '') return '0.00';
      const normalized = String(v).trim().replace(',', '.');
      const n = parseFloat(normalized);
      return isNaN(n) ? '0.00' : n.toFixed(2);
    };
    // Normaliza texto: trim + vazio vira string vazia
    const normStr = (v) => {
      if (v === null || v === undefined) return '';
      return String(v).trim();
    };

    const computeOrigHash = (p) => {
      const parts = [
        normStr(p.campo_hierarquico_1),
        normStr(p.campo_hierarquico_2),
        normStr(p.campo_hierarquico_3),
        normNum(p.valor_compra),
        normNum(p.casas_decimais),
        normNum(p.preco_venda_padrao),
        normStr(p.unidade_principal),
        normNum(p.custo_frete_padrao),
        normNum(p.custo_imposto1_padrao),
        normNum(p.custo_imposto2_padrao),
        normNum(p.desconto_compra_padrao),
      ];
      return parts.join('|');
    };

    // ── Fórmula para hash dinâmico (deve espelhar computeOrigHash) ────────────
    // Usa TEXT(x,"0.00") para garantir formato idêntico ao normNum do servidor
    const hashFormula = (rn) =>
      'CONCATENATE(TRIM(' + letH1 + rn + '),"|",TRIM(' + letH2 + rn + '),"|",TRIM(' + letH3 + rn + '),"|",'
      + 'TEXT(' + letVC + rn + ',"0.00"),"|",'
      + 'TEXT(' + letCD + rn + ',"0.00"),"|",'
      + 'TEXT(' + letPV + rn + ',"0.00"),"|",'
      + 'TRIM(' + letUN + rn + '),"|",'
      + 'TEXT(' + letFR + rn + ',"0.00"),"|",'
      + 'TEXT(' + letI1 + rn + ',"0.00"),"|",'
      + 'TEXT(' + letI2 + rn + ',"0.00"),"|",'
      + 'TEXT(' + letDC + rn + ',"0.00"))';

    // ── Fórmula Nome completo ─────────────────────────────────────────────────
    const nomeFormula = (rn) =>
      `=TRIM(CONCATENATE(${letH1}${rn},IF(${letH2}${rn}<>""," "&${letH2}${rn},""),IF(${letH3}${rn}<>""," "&${letH3}${rn},""),IF(${letH4}${rn}<>""," "&${letH4}${rn},""),IF(${letH5}${rn}<>""," "&${letH5}${rn},"")))`;

    // ── Linhas de dados ───────────────────────────────────────────────────────
    produtos.forEach((p, i) => {
      const rn = i + 2;
      const custoCalc = (p.valor_compra || 0) + (p.custo_frete_padrao || 0) +
                        (p.custo_imposto1_padrao || 0) + (p.custo_imposto2_padrao || 0) -
                        (p.desconto_compra_padrao || 0);
      const nomePartes = [p.campo_hierarquico_1, p.campo_hierarquico_2, p.campo_hierarquico_3,
                          p.campo_hierarquico_4, p.campo_hierarquico_5].filter(Boolean).join(' ');
      const origHash = computeOrigHash(p);

      const rowData = {};
      COLS_PRODUTOS.forEach(col => {
        switch (col.key) {
          case 'nome':
            rowData[col.key] = { formula: nomeFormula(rn), result: nomePartes }; break;
          case 'custo_total_calculado':
            rowData[col.key] = {
              formula: `=${letVC}${rn}+${letFR}${rn}+${letI1}${rn}+${letI2}${rn}-${letDC}${rn}`,
              result: custoCalc,
            }; break;
          case 'valor_compra_liq':
            // Valor de Compra * (1 - Desconto%/100) ; desconto>0=desconto, <0=acréscimo
            rowData[col.key] = {
              formula: `=IF(${letVC}${rn}="","",${letVC}${rn}*(1-${letDP}${rn}/100))`,
              result: p.valor_compra || 0,
            }; break;
          case 'desconto_perc':
            rowData[col.key] = 0; break; // inicia em 0 para produtos existentes
          case 'casas_decimais':
            rowData[col.key] = p.casas_decimais ?? 0; break;
          case '_hash_orig':
            rowData[col.key] = origHash; break; // valor estático gerado no servidor
          case 'alterado':
            rowData[col.key] = {
              formula: `=IF(${hashFormula(rn)}=${letHO}${rn},"NÃO","SIM")`,
              result: 'NÃO',
            }; break;
          case 'ativo':
            rowData[col.key] = p[col.key] !== false ? 'SIM' : 'NÃO'; break;
          default:
            rowData[col.key] = p[col.key] ?? '';
        }
      });

      const row = wsProd.addRow(rowData);
      row.eachCell({ includeEmpty: true }, (cell, cn) => {
        const cfg = COLS_PRODUTOS[cn - 1];
        const isLocked = !cfg || !cfg.editavel;
        cell.protection = { locked: isLocked };
        if (cfg?.key === '_hash_orig') {
          // Coluna oculta — largura mínima, cinza bem suave
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: LOCK_BG };
          cell.font = { size: 7, color: { argb: 'FFD1D5DB' } };
        } else if (cfg?.calculado) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
          cell.font = { italic: true, color: { argb: 'FF0369A1' } };
        } else if (cfg?.editavel) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: EDIT_BG };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: LOCK_BG };
        }
        if (cfg?.tipo === 'numero') cell.numFmt = '#,##0.00';
        // Coluna Alterado? com destaque verde/vermelho via condicional
      });
    });

    // ── Linhas em branco para novos produtos ─────────────────────────────────
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
          cell.value = { formula: nomeFormula(r), result: '' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
          cell.font = { italic: true, color: { argb: 'FF0369A1' } };
          cell.protection = { locked: true };
        }
        if (col.key === 'custo_total_calculado') {
          cell.value = { formula: `=${letVC}${r}+${letFR}${r}+${letI1}${r}+${letI2}${r}-${letDC}${r}`, result: 0 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
          cell.font = { italic: true, color: { argb: 'FF0369A1' } };
          cell.protection = { locked: true };
        }
        if (col.key === 'valor_compra_liq') {
          cell.value = { formula: `=IF(${letVC}${r}="","",${letVC}${r}*(1-${letDP}${r}/100))`, result: 0 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
          cell.font = { italic: true, color: { argb: 'FF0369A1' } };
          cell.protection = { locked: true };
        }
        if (col.key === '_hash_orig') {
          // Linhas novas: hash vazio (produto ainda não existe no sistema)
          cell.value = '';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: LOCK_BG };
          cell.font = { size: 7, color: { argb: 'FFD1D5DB' } };
          cell.protection = { locked: true };
        }
        if (col.key === 'alterado') {
          // Para linhas novas: se H1 preenchido = sempre SIM (produto novo)
          cell.value = {
            formula: `=IF(${letH1}${r}="","",IF(${letHO}${r}="","SIM",IF(${hashFormula(r)}=${letHO}${r},"NÃO","SIM")))`,
            result: '',
          };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CALC_BG };
          cell.font = { italic: true, color: { argb: 'FF0369A1' } };
          cell.protection = { locked: true };
        }
        if (col.tipo === 'numero') cell.numFmt = '#,##0.00';
      });
      row.commit();
    }

    // ── Formatações condicionais ──────────────────────────────────────────────
    // Preço de venda abaixo do custo: vermelho
    wsProd.addConditionalFormatting({
      ref: `${letPV}2:${letPV}${maxProdRows}`,
      rules: [{
        type: 'expression', priority: 1,
        formulae: [`AND(${letPV}2<>"",${letPV}2<${letCC}2)`],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFCA5A5' } }, font: { color: { argb: 'FF991B1B' }, bold: true } },
      }],
    });
    // Nova linha (sem ID): verde gelo
    wsProd.addConditionalFormatting({
      ref: `A2:${lastProdCol}${maxProdRows}`,
      rules: [{
        type: 'expression', priority: 2,
        formulae: [`$${letId}2=""`],
        style: { font: { color: { argb: 'FF166534' } }, fill: { type: 'pattern', pattern: 'solid', bgColor: NEW_BG } },
      }],
    });
    // Coluna Alterado? = SIM: amarelo suave
    wsProd.addConditionalFormatting({
      ref: `${letAL}2:${letAL}${maxProdRows}`,
      rules: [{
        type: 'expression', priority: 3,
        formulae: [`${letAL}2="SIM"`],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEF9C3' } }, font: { color: { argb: 'FF92400E' }, bold: true } },
      }],
    });
    // Desconto negativo (acréscimo) na col desconto_perc: laranja suave
    wsProd.addConditionalFormatting({
      ref: `${letDP}2:${letDP}${maxProdRows}`,
      rules: [{
        type: 'expression', priority: 4,
        formulae: [`${letDP}2<0`],
        style: { font: { color: { argb: 'FF7C2D12' }, bold: true } },
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

    const letIdForn  = colLetter(COLS_FORN.findIndex(c => c.key === 'id') + 1);
    const lastFornCol = colLetter(COLS_FORN.length);
    const maxFornRows = 1 + fornecedores.length + 500;

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

    // ── Gerar e retornar buffer ───────────────────────────────────────────────
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