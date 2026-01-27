import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  console.log('=== INÍCIO GERAR RELATÓRIO PEDIDO ===');
  
  try {
    console.log('1. Criando cliente Base44...');
    const base44 = createClientFromRequest(req);
    
    console.log('2. Verificando autenticação...');
    const user = await base44.auth.me();
    console.log('User:', user?.email);

    if (!user) {
      console.log('ERRO: Usuário não autenticado');
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('3. Lendo body da requisição...');
    const body = await req.json();
    console.log('Body recebido:', JSON.stringify(body));
    
    const pedido_id = body?.pedido_id;
    console.log('pedido_id extraído:', pedido_id);

    if (!pedido_id) {
      console.log('ERRO: pedido_id não fornecido');
      return Response.json({ error: 'pedido_id obrigatório' }, { status: 400 });
    }

    console.log('4. Buscando pedido no banco...');
    const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id });
    console.log('Pedidos encontrados:', pedidos?.length);
    
    if (!pedidos || pedidos.length === 0) {
      console.log('ERRO: Pedido não encontrado');
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }
    
    const pedido = pedidos[0];
    console.log('Pedido carregado:', pedido.numero);

    console.log('5. Criando PDF...');
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('PEDIDO DE COMPRA', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(pedido.numero || 'N/A', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Fornecedor: ${pedido.fornecedor_nome || 'N/A'}`, 14, 50);
    doc.text(`Status: ${pedido.status || 'N/A'}`, 14, 56);

    console.log('6. Gerando arraybuffer...');
    const pdfBytes = doc.output('arraybuffer');
    console.log('PDF gerado com sucesso. Tamanho:', pdfBytes.byteLength, 'bytes');

    console.log('7. Retornando resposta...');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pedido_${pedido.numero || 'compra'}.pdf`
      }
    });

  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ 
      error: 'Erro ao gerar relatório', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});