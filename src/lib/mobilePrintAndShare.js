import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Mobile/tablet: popups e `window.print()` em iframe costumam falhar ou ser bloqueados.
 * Preferimos PDF/HTML via blob + Web Share API ou download.
 */
export function shouldUseMobileDocumentExport() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(pointer: coarse)').matches) return true;
    if (window.matchMedia('(max-width: 768px)').matches) return true;
  } catch (_) {
    /* ignore */
  }
  return /Android|iPhone|iPad|iPod|webOS|Mobile/i.test(navigator.userAgent || '');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * @returns {'shared'|'downloaded'|'aborted'}
 */
export async function shareOrDownloadBlob(blob, filename, mimeType, title) {
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: title || filename });
        return 'shared';
      }
    } catch (e) {
      if (e?.name === 'AbortError') return 'aborted';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}

/**
 * Mesma lógica dos comprovantes: captura do DOM → PDF (80mm ou A4).
 */
export async function renderElementToPdfBlob(element, { formato = '80mm' } = {}) {
  if (!element) throw new Error('Elemento inválido');
  const isA4 = formato === 'a4';
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  const imgData = canvas.toDataURL('image/png');
  let pdf;
  if (isA4) {
    pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const ratio = canvas.width / canvas.height;
    const imgH = pageW / ratio;
    pdf.addImage(imgData, 'PNG', 0, 0, pageW, Math.min(imgH, pageH));
  } else {
    const widthMm = 80;
    const heightMm = (canvas.height / canvas.width) * widthMm;
    pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [widthMm, heightMm] });
    pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
  }
  return pdf.output('blob');
}

/**
 * @param elementId {string|HTMLElement}
 */
export async function exportCupomToPdfAndShareOrDownload(elementId, {
  formato = '80mm',
  fileBaseName = 'documento',
  title,
} = {}) {
  const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
  if (!el) throw new Error('Elemento não encontrado');
  const blob = await renderElementToPdfBlob(el, { formato: formato === 'a4' ? 'a4' : '80mm' });
  const name = `${fileBaseName}.pdf`;
  return shareOrDownloadBlob(blob, name, 'application/pdf', title || name);
}

/**
 * Exporta HTML completo (orçamentos leves, etc.): partilha ou descarrega .html
 */
export async function shareOrDownloadHtmlDocument(htmlString, filename, title) {
  const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
  return shareOrDownloadBlob(blob, filename, 'text/html', title || filename);
}
