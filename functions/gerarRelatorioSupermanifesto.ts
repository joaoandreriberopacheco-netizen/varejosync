import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { supermanifesto_id } = await req.json();

    if (!supermanifesto_id) {
      return Response.json({ error: 'ID do supermanifesto obrigatório' }, { status: 400 });
    }

    // 1. Buscar dados
    const [supermanifesto] = await base44.asServiceRole.entities.Supermanifesto.filter({ id: supermanifesto_id });
    if (!supermanifesto) {
      return Response.json({ error: 'Supermanifesto não encontrado' }, { status: 404 });
    }

    const manifestos = await base44.asServiceRole.entities.ManifestoEntrada.filter({ 
      supermanifesto_id: supermanifesto_id 
    });

    // 2. Preparar PDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text('Relatório de Supermanifesto', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
    
    // Info Principal
    doc.setDrawColor(200);
    doc.line(14, 32, 196, 32);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Número: ${supermanifesto.numero}`, 14, 40);
    doc.text(`Transportadora: ${supermanifesto.transportadora_nome}`, 14, 46);
    
    doc.setFont(undefined, 'normal');
    doc.text(`Status: ${supermanifesto.status}`, 140, 40);
    doc.text(`ETA: ${supermanifesto.eta ? new Date(supermanifesto.eta).toLocaleString('pt-BR') : '-'}`, 140, 46);
    
    // Totais
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 52, 182, 18, 'F');
    doc.setFontSize(10);
    doc.text('Totais Consolidados:', 18, 58);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(supermanifesto.valor_total_estimado || 0);
    doc.text(`Valor Carga: ${valorFmt}`, 18, 65);
    doc.text(`Volumes: ${supermanifesto.quantidade_volumes_estimada || 0}`, 80, 65);
    doc.text(`Peso: ${(supermanifesto.peso_total_bruto_kg || 0).toFixed(2)} kg`, 140, 65);
    
    let yPos = 80;

    // Listar Manifestos
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Detalhamento da Carga', 14, yPos);
    yPos += 10;

    for (const m of manifestos) {
      // Box do Manifesto
      doc.setDrawColor(220);
      doc.setFillColor(255, 255, 255);
      doc.rect(14, yPos, 182, 10, 'S');
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`Manifesto: ${m.numero}`, 16, yPos + 7);
      doc.setFont(undefined, 'normal');
      doc.text(`Fornecedor: ${m.fornecedor_nome}`, 80, yPos + 7);
      doc.text(`Pedido: ${m.pedido_numero || '-'}`, 150, yPos + 7);
      
      yPos += 12;
      
      // Volumes do Manifesto
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
          margin: { left: 20 },
          tableWidth: 170
        });
        
        yPos = doc.lastAutoTable.finalY + 8;
      } else {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text('Nenhum volume discriminado.', 20, yPos + 4);
        doc.setTextColor(0);
        yPos += 10;
      }
      
      // Espaçamento entre manifestos
      yPos += 5;
      
      // Nova página se necessário
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
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