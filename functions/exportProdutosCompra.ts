import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { encodeBase64 } from "jsr:@std/encoding/base64";

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

    const produtos = await base44.entities.Produto.filter({ ativo: true }, undefined, 10000);

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

    const rows = produtos.map(p => {
      // Escape function for CSV fields
      const esc = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const fmtNum = (val) => (typeof val === 'number' ? val.toFixed(2).replace('.', ',') : '');

      return [
        esc(p.id),
        esc(p.codigo_interno || p.codigo_barras || ''),
        esc(p.nome),
        esc(p.unidade_principal || 'UN'),
        fmtNum(p.valor_compra || 0),
        '', 
        '', 
        '', 
        '' 
      ].join(';'); 
    });

    const csvContent = [headers.join(';'), ...rows].join('\n');
    
    // Add BOM for Excel UTF-8 recognition
    const bom = '\uFEFF'; 
    const finalContent = bom + csvContent;

    // Encode to Base64 to safely transport via JSON
    const textEncoder = new TextEncoder();
    const encoded = textEncoder.encode(finalContent);
    const base64Content = encodeBase64(encoded);

    return Response.json({ 
      file_content: base64Content,
      filename: 'modelo_importacao_compra.csv'
    });

  } catch (error) {
    console.error('Error exporting products:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}