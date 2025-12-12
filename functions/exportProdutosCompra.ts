import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export const config = {
  path: "/exportProdutosCompra"
};

export default async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch all active products
    // Note: In a real large-scale scenario, we would paginate. 
    // Here we fetch up to 10000 for simplicity as per common use case limits.
    const produtos = await base44.entities.Produto.filter({ ativo: true }, undefined, 10000);

    // CSV Headers
    const headers = [
      'ID_SISTEMA',
      'CODIGO',
      'PRODUTO',
      'UNIDADE',
      'CUSTO_ATUAL',
      'QUANTIDADE_COMPRA',
      'NOVO_CUSTO_UNITARIO',
      'FRETE_UNITARIO',
      'DESCONTO_UNITARIO'
    ];

    // CSV Rows
    const rows = produtos.map(p => {
      return [
        p.id,
        `"${(p.codigo_interno || p.codigo_barras || '').replace(/"/g, '""')}"`, // Escape quotes
        `"${(p.nome || '').replace(/"/g, '""')}"`,
        p.unidade_principal || 'UN',
        (p.valor_compra || 0).toFixed(2).replace('.', ','), // Format for Excel (comma decimal)
        '', // Quantidade (Empty for user input)
        '', // Novo Custo (Empty, user defaults to Custo Atual if left blank)
        '', // Frete (Empty)
        ''  // Desconto (Empty)
      ].join(';'); // Semicolon delimiter is standard for Excel in many regions (like Brazil)
    });

    const csvContent = [headers.join(';'), ...rows].join('\n');
    
    // Add BOM for Excel to recognize UTF-8
    const bom = '\uFEFF'; 
    const finalContent = bom + csvContent;

    return new Response(finalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=modelo_importacao_compra.csv'
      }
    });

  } catch (error) {
    console.error('Error exporting products:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}