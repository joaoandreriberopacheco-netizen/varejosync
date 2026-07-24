// Port automático de base44/functions/gerarRelatorioConferencia/entry.ts
import type { createP38Client } from '../p38Client.ts';

import { jsPDF } from 'npm:jspdf@4.0.0';

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supermanifesto_id } = await req.json();

    if (!supermanifesto_id) {
      return Response.json({ error: 'supermanifesto_id é obrigatório' }, { status: 400 });
    }

    // Buscar dados do supermanifesto
    const manifesto = await base44.asServiceRole.entities.Supermanifesto.get(supermanifesto_id);

    if (!manifesto) {
      return Response.json({ error: 'Supermanifesto não encontrado' }, { status: 404 });
    }

    // Criar PDF
    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(18);
    doc.text('RELATÓRIO DE CONFERÊNCIA DE VOLUMES', 20, 20);

    doc.setFontSize(10);
    doc.text(`Supermanifesto: ${manifesto.numero || 'N/A'}`, 20, 30);
    doc.text(`Transportadora: ${manifesto.transportadora_nome || 'N/A'}`, 20, 36);
    doc.text(`Data/Hora: ${manifesto.data_conferencia_volumes ? new Date(manifesto.data_conferencia_volumes).toLocaleString('pt-BR') : 'N/A'}`, 20, 42);
    doc.text(`Conferente: ${manifesto.conferente_volumes_nome || 'N/A'}`, 20, 48);
    doc.text(`Status: ${manifesto.tem_divergencias ? 'COM DIVERGÊNCIAS' : 'CONFERIDO OK'}`, 20, 54);

    // Linha separadora
    doc.line(20, 58, 190, 58);

    // Volumes Esperados vs Conferidos
    doc.setFontSize(12);
    doc.text('VOLUMES', 20, 66);

    doc.setFontSize(9);
    let y = 74;

    // Tabela de volumes
    doc.text('TIPO', 20, y);
    doc.text('ESPERADO', 90, y);
    doc.text('CONFERIDO', 130, y);
    doc.text('STATUS', 170, y);
    
    y += 2;
    doc.line(20, y, 190, y);
    y += 6;

    const volumesEsperados = manifesto.volumes || [];
    const volumesConferidos = manifesto.volumes_conferidos || [];

    // Criar um mapa de volumes esperados
    const mapEsperados = {};
    volumesEsperados.forEach(v => {
      mapEsperados[v.descricao] = v.quantidade;
    });

    // Criar um mapa de volumes conferidos
    const mapConferidos = {};
    volumesConferidos.forEach(v => {
      mapConferidos[v.descricao] = v.quantidade;
    });

    // Combinar as chaves (descrições) de ambos
    const todasDescricoes = new Set([...Object.keys(mapEsperados), ...Object.keys(mapConferidos)]);

    todasDescricoes.forEach(descricao => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const esperado = mapEsperados[descricao] || 0;
      const conferido = mapConferidos[descricao] || 0;
      const statusVol = esperado === conferido ? 'OK' : 'DIVERGÊNCIA';

      doc.text(descricao.substring(0, 30), 20, y);
      doc.text(String(esperado), 90, y);
      doc.text(String(conferido), 130, y);
      doc.text(statusVol, 170, y);

      y += 6;
    });

    // Ocorrências
    if (manifesto.ocorrencias_conferencia && manifesto.ocorrencias_conferencia.length > 0) {
      y += 10;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.text('OCORRÊNCIAS REGISTRADAS', 20, y);
      y += 8;

      doc.setFontSize(9);
      manifesto.ocorrencias_conferencia.forEach((ocorrencia, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.text(`${idx + 1}. ${ocorrencia.descricao}`, 20, y);
        y += 6;

        if (ocorrencia.midias && ocorrencia.midias.length > 0) {
          doc.text(`   Evidências: ${ocorrencia.midias.length} arquivo(s)`, 20, y);
          y += 6;
        }
      });
    }

    // Assinatura
    y += 10;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.line(20, y, 90, y);
    y += 6;
    doc.text(`Conferente: ${manifesto.conferente_volumes_nome || ''}`, 20, y);

    // Gerar bytes do PDF
    const pdfBytes = doc.output('arraybuffer');

    // Upload do PDF
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([blob], `conferencia_${manifesto.numero}_${Date.now()}.pdf`, { type: 'application/pdf' });

    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    // Atualizar o supermanifesto com a URL do relatório
    await base44.asServiceRole.entities.Supermanifesto.update(supermanifesto_id, {
      relatorio_conferencia_url: file_url
    });

    return Response.json({ 
      success: true, 
      relatorio_url: file_url 
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
