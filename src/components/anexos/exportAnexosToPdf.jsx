import { jsPDF } from 'jspdf';

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function getExtensionFromMime(mimeType = '') {
  if (mimeType.includes('png')) return 'PNG';
  return 'JPEG';
}

export default async function exportAnexosToPdf(anexos = []) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let hasPage = false;

  for (const anexo of anexos) {
    if (!anexo?.url_drive) continue;

    const isImage = anexo.mime_type?.startsWith('image/');
    const isPdf = anexo.mime_type?.includes('pdf');

    if (!isImage && !isPdf) continue;

    if (hasPage) doc.addPage();
    hasPage = true;

    doc.setFontSize(12);
    doc.text(anexo.nome_arquivo || 'Anexo', 14, 14);

    if (isImage) {
      const image = await loadImage(anexo.url_drive);
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 14;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - 30 - margin;
      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
      const width = image.width * ratio;
      const height = image.height * ratio;
      const x = (pageWidth - width) / 2;
      const y = 24 + (maxHeight - height) / 2;

      doc.addImage(image, getExtensionFromMime(anexo.mime_type), x, y, width, height);
    } else {
      doc.setFontSize(11);
      doc.text('Arquivo PDF anexado', 14, 32);
      doc.setFontSize(10);
      doc.text('Abra o arquivo original para visualizar o conteúdo completo.', 14, 40);
      doc.text(anexo.url_drive, 14, 52, { maxWidth: 180 });
    }
  }

  if (!hasPage) {
    doc.text('Nenhum anexo compatível para exportação.', 14, 20);
  }

  doc.save('anexos.pdf');
}