import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ExcelJS = await import('npm:exceljs@4.4.0');
    const workbook = new ExcelJS.default.Workbook();

    // ─── PLANILHA 1: CABEÇALHO ───
    const wsCabecalho = workbook.addWorksheet('Cabeçalho');
    
    wsCabecalho.addRow(['PEDIDO DE COMPRA - TEMPLATE']);
    wsCabecalho.addRow([]);
    wsCabecalho.addRow(['DADOS DO FORNECEDOR']);
    wsCabecalho.addRow(['Fornecedor:', '', 'Data do Pedido:', new Date().toISOString().split('T')[0]]);
    wsCabecalho.addRow(['CNPJ:', '', 'Data Prevista Entrega:', '']);
    wsCabecalho.addRow([]);
    wsCabecalho.addRow(['DADOS FINANCEIROS']);
    wsCabecalho.addRow(['Subtotal:', '', 'Total:', '']);

    wsCabecalho.columns = [
      { width: 25 },
      { width: 30 },
      { width: 25 },
      { width: 30 }
    ];

    // ─── PLANILHA 2: ITENS ───
    const wsItens = workbook.addWorksheet('Itens');
    
    wsItens.addRow(['Produto', 'Código', 'Quantidade', 'Valor Unitário', 'Total']);
    
    for (let i = 0; i < 10; i++) {
      wsItens.addRow(['', '', '', '', '']);
    }

    wsItens.columns = [
      { width: 30 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];

    // Estilo do cabeçalho
    wsItens.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    wsItens.getRow(1).font = { bold: true };

    // Gerar arquivo
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_pedido_compra.xlsx"',
        'Content-Length': buffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Erro ao gerar template:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});