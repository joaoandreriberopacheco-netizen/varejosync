/**
 * Utilitários para PDF no importador AGEFIN (Torre / Contas a pagar).
 *
 * Nota: o bundle **Base44/sin** não resolve o pacote `pdfjs-dist`, por isso não há
 * extração local de texto no browser. A leitura do boleto depende de
 * `UploadFile` + `InvokeLLM` com `file_urls`. Mantemos `extrairTextoPdfBrowser`
 * (devolve vazio) para não quebrar o fluxo e permitir reintroduzir texto local
 * noutro ambiente se no futuro o pacote for suportado.
 */

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
 * Reservado: extração de texto no cliente (ex. pdf.js). No Base44/sin devolve sempre
 * string vazia — o prompt de texto local não é anexado; o LLM usa só o PDF enviado.
 */
export async function extrairTextoPdfBrowser(_file) {
  return '';
}
