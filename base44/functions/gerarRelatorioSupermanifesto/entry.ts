import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { supermanifesto_id, tipo = 'volumes' } = await req.json(); // tipo: 'volumes' | 'carga'

    if (!supermanifesto_id) {
      return Response.json({ error: 'ID do supermanifesto obrigatório' }, { status: 400 });
    }

    // 1. Buscar dados básicos
    const [supermanifesto] = await base44.asServiceRole.entities.Supermanifesto.filter({ id: supermanifesto_id });
    if (!supermanifesto) {
      return Response.json({ error: 'Supermanifesto não encontrado' }, { status: 404 });
    }

    const manifestos = await base44.asServiceRole.entities.ManifestoEntrada.filter({ 
      supermanifesto_id: supermanifesto_id 
    });

    // 2. Preparar PDF
    const doc = new jsPDF();
    const titulo = tipo === 'carga' ? 'Relatório de Carga (Produtos)' : 'Relatório de Volumes';
    
    // Header Geral
    doc.setFontSize(22);
    doc.text(titulo, 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
    doc.text(`Supermanifesto: ${supermanifesto.numero}`, 14, 34);
    doc.text(`Transportadora: ${supermanifesto.transportadora_nome}`, 14, 40);
    
    if (supermanifesto.eta) {
        doc.text(`ETA: ${new Date(supermanifesto.eta).toLocaleString('pt-BR')}`, 14, 46);
    }
    
    let yPos = 54;

    // --- LÓGICA DO RELATÓRIO DE CARGA ---
    if (tipo === 'carga') {
      // Buscar pedidos de compra para detalhar itens
      const pedidosPromises = manifestos
        .filter(m => m.pedido_compra_id)
        .map(m => base44.asServiceRole.entities.PedidoCompra.filter({ id: m.pedido_compra_id }));
      
      const pedidosResults = await Promise.all(pedidosPromises);
      const pedidosMap = {}; // Map pedido_id -> pedido object
      pedidosResults.flat().forEach(p => { pedidosMap[p.id] = p; });

      // Totais Financeiros
      const valorTotalCarga = supermanifesto.valor_total_estimado || 0;
      const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalCarga);

      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos, 182, 12, 'F');
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Valor Total Estimado: ${valorFmt}`, 18, yPos + 8);
      yPos += 20;

      for (const m of manifestos) {
        const pedido = m.pedido_compra_id ? pedidosMap[m.pedido_compra_id] : null;

        // Box do Manifesto
        doc.setDrawColor(220);
        doc.setFillColor(255, 255, 255);
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`Manifesto: ${m.numero}`, 14, yPos);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Fornecedor: ${m.fornecedor_nome}`, 14, yPos + 5);
        if (pedido) {
           doc.text(`Pedido: ${pedido.numero}`, 100, yPos + 5);
        }
        yPos += 8;

        if (pedido && pedido.itens && pedido.itens.length > 0) {
          const tableData = pedido.itens.map(item => [
            item.produto_nome || 'Produto sem nome',
            item.quantidade || 0,
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.custo_unitario || 0),
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total || 0)
          ]);

          doc.autoTable({
            startY: yPos,
            head: [['Produto', 'Qtd', 'Vl. Unit.', 'Total']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 80 },
              1: { cellWidth: 20, halign: 'center' },
              2: { cellWidth: 30, halign: 'right' },
              3: { cellWidth: 30, halign: 'right' }
            },
            margin: { left: 14, right: 14 }
          });
          
          yPos = doc.lastAutoTable.finalY + 10;
        } else {
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text('Sem itens ou pedido vinculado.', 14, yPos + 5);
          doc.setTextColor(0);
          yPos += 15;
        }

        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      }

    } 
    // --- LÓGICA DO RELATÓRIO DE VOLUMES (Padrão anterior) ---
    else {
      // Totais de Volumes
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos, 182, 14, 'F');
      doc.setFontSize(10);
      
      doc.setFont(undefined, 'bold');
      doc.text(`Volumes Totais: ${supermanifesto.quantidade_volumes_estimada || 0}`, 18, yPos + 9);
      doc.text(`Peso Total: ${(supermanifesto.peso_total_bruto_kg || 0).toFixed(2)} kg`, 80, yPos + 9);
      
      yPos += 24;

      for (const m of manifestos) {
        // Box do Manifesto
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`Manifesto: ${m.numero}`, 14, yPos);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Fornecedor: ${m.fornecedor_nome}`, 60, yPos);
        
        yPos += 6;
        
        if (m.volumes && m.volumes.length > 0) {
          const tableData = m.volumes.map(v => [
            v.descricao,
            v.quantidade,
            `${(v.peso_kg || 0).toFixed(2)} kg`
          ]);

          doc.autoTable({
            startY: yPos,
            head: [['Descrição do Volume', 'Qtd', 'Peso']],
            body: tableData,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [245, 245, 245], textColor: 80, fontStyle: 'bold' },
            margin: { left: 14, right: 14 } // Alinhado com margem padrão
          });
          
          yPos = doc.lastAutoTable.finalY + 10;
        } else {
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text('Nenhum volume discriminado.', 14, yPos + 4);
          doc.setTextColor(0);
          yPos += 12;
        }
        
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      }
    }

    // Output
    const pdfOutput = doc.output('arraybuffer');
    const pdfBase64 = btoa(
      new Uint8Array(pdfOutput)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return Response.json({ pdfBase64 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});