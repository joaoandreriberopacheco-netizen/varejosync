import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { encodeBase64 } from "jsr:@std/encoding/base64";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const XLSX = await import('npm:xlsx@0.18.5');

    // Criar dados das abas
    const cabecalhoData = [
      ['PEDIDO DE COMPRA - TEMPLATE'],
      [],
      ['DADOS DO FORNECEDOR'],
      ['Fornecedor:', '', 'Data do Pedido:', new Date().toISOString().split('T')[0]],
      ['CNPJ:', '', 'Data Prevista Entrega:', ''],
      [],
      ['DADOS FINANCEIROS'],
      ['Subtotal:', '', 'Total:', '']
    ];

    const itensData = [
      ['Produto', 'Código', 'Quantidade', 'Valor Unitário', 'Total']
    ];
    
    // Adicionar 10 linhas vazias para preenchimento
    for (let i = 0; i < 10; i++) {
      itensData.push(['', '', '', '', '']);
    }

    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    // Adicionar planilhas
    const wsCabecalho = XLSX.utils.aoa_to_sheet(cabecalhoData);
    wsCabecalho['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsCabecalho, 'Cabeçalho');

    const wsItens = XLSX.utils.aoa_to_sheet(itensData);
    wsItens['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsItens, 'Itens');

    // Escrever como buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_pedido_compra.xlsx"'
      }
    });
  } catch (error) {
    console.error('Erro ao gerar template:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});