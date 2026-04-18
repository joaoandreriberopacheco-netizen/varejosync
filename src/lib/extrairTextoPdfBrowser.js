/**
 * Extrai texto de PDFs com camada de texto (boletos digitais, DARF, etc.).
 * PDF só com imagem ou protegido devolve string vazia — não substitui o fluxo com LLM/visão.
 */
export async function extrairTextoPdfBrowser(file) {
  if (!file || typeof file.arrayBuffer !== 'function') return '';
  const name = String(file.name || '').toLowerCase();
  const type = String(file.type || '').toLowerCase();
  if (!name.endsWith('.pdf') && type !== 'application/pdf') return '';

  try {
    const [pdfjsMod, workerMod] = await Promise.all([
      import('pdfjs-dist/build/pdf.mjs'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    const pdfjsLib = pdfjsMod;
    const workerUrl = workerMod.default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

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
