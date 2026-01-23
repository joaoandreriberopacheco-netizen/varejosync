import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

// Helper para decodificar caracteres especiais do português
function decodeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/Ã§/g, 'ç')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã¢/g, 'â')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã /g, 'à')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ã/g, 'Ã')
    .replace(/Â°/g, 'º');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { pedido_id } = await req.json();
    
    if (!pedido_id) {
      return Response.json({ error: 'ID do pedido é obrigatório' }, { status: 400 });
    }

    const [pedidos, divergencias] = await Promise.all([
      base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id }),
      base44.asServiceRole.entities.DivergenciaCompra.filter({ pedido_compra_id: pedido_id })
    ]);

    const pedido = pedidos[0];
    if (!pedido) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (!divergencias || divergencias.length === 0) {
      return Response.json({ 
        error: 'Nenhuma pendência encontrada para este pedido' 
      }, { status: 404 });
    }

    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(decodeText('RELATORIO DE PENDENCIAS'), 105, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(decodeText(`Pedido: ${pedido.numero || 'N/A'}`), 20, y);
    doc.text(decodeText(`Fornecedor: ${pedido.fornecedor_nome || 'N/A'}`), 20, y + 5);
    doc.text(decodeText(`Data: ${new Date().toLocaleDateString('pt-BR')}`), 150, y);
    y += 20;

    // Resumo
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(decodeText('RESUMO DAS PENDENCIAS'), 20, y);
    y += 8;

    const pendentes = divergencias.filter(d => d.status === 'Pendente').length;
    const resolvidas = divergencias.filter(d => d.status === 'Resolvido').length;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(decodeText(`• Total de divergencias: ${divergencias.length}`), 25, y);
    y += 6;
    doc.text(decodeText(`• Pendentes: ${pendentes}`), 25, y);
    y += 6;
    doc.text(decodeText(`• Resolvidas: ${resolvidas}`), 25, y);
    y += 12;

    // Detalhamento
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(decodeText('DETALHAMENTO DAS DIVERGENCIAS'), 20, y);
    y += 8;

    divergencias.forEach((div, index) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(decodeText(`${index + 1}. ${div.produto_nome || 'Produto nao identificado'}`), 20, y);
      y += 6;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      doc.text(decodeText(`Tipo: ${div.tipo_divergencia}`), 25, y);
      y += 5;
      
      if (div.quantidade_esperada !== undefined) {
        doc.text(decodeText(`Quantidade esperada: ${div.quantidade_esperada}`), 25, y);
        y += 5;
      }
      
      if (div.quantidade_recebida !== undefined) {
        doc.text(decodeText(`Quantidade recebida: ${div.quantidade_recebida}`), 25, y);
        y += 5;
      }
      
      doc.text(decodeText(`Status: ${div.status}`), 25, y);
      y += 5;
      
      if (div.observacoes) {
        doc.text(decodeText(`Observacoes: ${div.observacoes}`), 25, y);
        y += 5;
      }

      if (div.resolucao && div.status === 'Resolvido') {
        doc.setTextColor(0, 150, 0);
        doc.text(decodeText(`Resolucao: ${div.resolucao}`), 25, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      }

      if (div.imagem_url) {
        doc.text(decodeText('Evidencia fotografica anexada'), 25, y);
        y += 5;
      }

      y += 8;
    });

    // Ações Necessárias
    if (pendentes > 0) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(decodeText('ACOES NECESSARIAS'), 20, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(decodeText('• Contatar fornecedor para resolucao das pendencias'), 25, y);
      y += 6;
      doc.text(decodeText('• Aguardar reenvio de produtos faltantes ou danificados'), 25, y);
      y += 6;
      doc.text(decodeText('• Solicitar nota de credito para itens nao recebidos'), 25, y);
      y += 6;
      doc.text(decodeText('• Atualizar status apos resolucao de cada item'), 25, y);
    }

    // Assinaturas
    y += 15;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(10);
    doc.text('_'.repeat(40), 20, y);
    doc.text('_'.repeat(40), 120, y);
    y += 5;
    doc.text(decodeText('Responsavel pela Conferencia'), 22, y);
    doc.text(decodeText('Gestor de Compras'), 135, y);

    const pdfBytes = doc.output('arraybuffer');
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Relatorio_Pendencias_${pedido.numero}.pdf`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return Response.json({ 
      error: 'Erro ao gerar relatório',
      details: error.message 
    }, { status: 500 });
  }
});