import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Importar biblioteca de Excel
    const XLSX = await import('npm:xlsx@0.18.5');

    // Criar workbook
    const wb = XLSX.utils.book_new();

    // ─── PLANILHA 1: CABEÇALHO DO PEDIDO ───
    const cabecalho = [
      ['PEDIDO DE COMPRA - TEMPLATE'],
      [],
      ['DADOS DO FORNECEDOR'],
      ['Fornecedor:', '', 'Data do Pedido:', new Date().toISOString().split('T')[0]],
      ['CNPJ:', '', 'Data Prevista Entrega:', ''],
      [],
      ['DADOS FINANCEIROS'],
      ['Subtotal:', '=SUM(Itens!D:D)', 'Total:', '=SUM(Itens!D:D)'],
      [],
    ];

    const wsCabecalho = XLSX.utils.aoa_to_sheet(cabecalho);
    wsCabecalho['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsCabecalho, 'Cabeçalho');

    // ─── PLANILHA 2: ITENS ───
    const itens = [
      ['Produto', 'Código', 'Quantidade', 'Valor Unitário', 'Total'],
      ['', '', '', '', '=C2*D2'],
      ['', '', '', '', '=C3*D3'],
      ['', '', '', '', '=C4*D4'],
      ['', '', '', '', '=C5*D5'],
      ['', '', '', '', '=C6*D6'],
      ['', '', '', '', '=C7*D7'],
      ['', '', '', '', '=C8*D8'],
      ['', '', '', '', '=C9*D9'],
      ['', '', '', '', '=C10*D10'],
    ];

    const wsItens = XLSX.utils.aoa_to_sheet(itens);
    wsItens['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    
    // Aplicar estilos básicos
    for (let i = 0; i < 5; i++) {
      wsItens[XLSX.utils.encode_col(i) + '1'].s = { 
        fill: { fgColor: { rgb: 'FFD3D3D3' } },
        font: { bold: true }
      };
    }

    XLSX.utils.book_append_sheet(wb, wsItens, 'Itens');

    // Gerar arquivo
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new Response(wbout, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_pedido_compra.xlsx"'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});