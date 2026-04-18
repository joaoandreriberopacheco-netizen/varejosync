/**
 * Import só pela raiz do pacote (`package.json` → `main`) — evita falha de resolve
 * em bundlers que não mapeiam `pdfjs-dist/build/pdf.mjs` (ex.: alguns ambientes Base44).
 */
import * as pdfjsLib from 'pdfjs-dist';

/** Manter igual à versão instalada em package.json (pdfjs-dist). */
const PDFJS_DIST_VERSION = '4.8.69';

let workerSrcConfigurado = false;

function ensurePdfjsWorker() {
  if (typeof window === 'undefined') return;
  if (workerSrcConfigurado) return;
  workerSrcConfigurado = true;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_DIST_VERSION}/build/pdf.worker.min.mjs`;
}

/**
 * Detecta assinatura %PDF- no início do blob (partilha Web manda às vezes sem extensão / octet-stream).
 */
export async function blobParecePdf(blob) {
  if (!blob || typeof blob.slice !== 'function') return false;
  try {
    const buf = await blob.slice(0, 5).arrayBuffer();
    const u = new Uint8Array(buf);
    return u[0] === 0x25 && u[1] === 0x50 && u[2] === 0x44 && u[3] === 0x46;
  } catch {
    return false;
  }
}

/**
 * Garante `File` com nome `.pdf` e MIME `application/pdf` quando o conteúdo é PDF
 * (ex.: Android share → `content` sem extensão, `application/octet-stream`).
 */
export async function normalizarArquivoParaImportBoleto(file) {
  if (!file) return file;
  const name = String(file.name || '').toLowerCase();
  const type = String(file.type || '').toLowerCase();
  if (name.endsWith('.pdf') || type === 'application/pdf') {
    if (file instanceof File && type !== 'application/pdf' && name.endsWith('.pdf')) {
      return new File([file], file.name, { type: 'application/pdf', lastModified: file.lastModified });
    }
    return file;
  }
  if (await blobParecePdf(file)) {
    const raw = String(file.name || 'boleto').replace(/[/\\]/g, '-');
    const base = raw.includes('.') ? raw.replace(/\.[^.]+$/, '') : raw;
    const safe = `${base || 'boleto'}.pdf`;
    return new File([file], safe, {
      type: 'application/pdf',
      lastModified: file.lastModified || Date.now(),
    });
  }
  return file;
}

/**
 * Extrai texto de PDFs com camada de texto (boletos digitais, DARF, etc.).
 * PDF só com imagem ou protegido devolve string vazia — não substitui o fluxo com LLM/visão.
 */
export async function extrairTextoPdfBrowser(file) {
  if (!file || typeof file.arrayBuffer !== 'function') return '';
  const name = String(file.name || '').toLowerCase();
  const type = String(file.type || '').toLowerCase();
  const parecePdf = name.endsWith('.pdf') || type === 'application/pdf' || (await blobParecePdf(file));
  if (!parecePdf) return '';

  try {
    ensurePdfjsWorker();

    const buf = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: buf, useSystemFonts: true });
    const pdf = await loadingTask.promise;
    const maxPages = Math.min(pdf.numPages, 10);
    const parts = [];
    for (let i = 1; i <= maxPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const line = (content.items || [])
        .map((it) => (it && typeof it.str === 'string' ? it.str : ''))
        .join(' ');
      if (line.trim()) parts.push(line);
    }
    return parts.join('\n').replace(/\s+/g, ' ').trim();
  } catch (e) {
    console.warn('[extrairTextoPdfBrowser]', e);
    return '';
  }
}
