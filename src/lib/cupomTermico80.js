/**
 * Bobina 80 mm, área útil ~72 mm, impressoras térmicas de baixa qualidade.
 * Sem cinza claro, sem fontes finas, contraste máximo.
 */

export const CUPOM_PAPEL_MM = 80;
export const CUPOM_LARGURA_UTIL_MM = 72;
/** Margem extra à esquerda no papel (compensa “puxar” para a esquerda na impressão). */
export const CUPOM_MARGEM_ESQ_MM = 5;
export const CUPOM_MARGEM_DIR_MM = 3;

const MM_TO_PX = 96 / 25.4;

export const CUPOM_LARGURA_UTIL_PX = Math.round(CUPOM_LARGURA_UTIL_MM * MM_TO_PX);
export const CUPOM_PAPEL_PX = Math.round(CUPOM_PAPEL_MM * MM_TO_PX);

/** Arial/Helvetica — traços grossos, legível em 203 dpi. */
export const FONT_TERMICA =
  'Arial, Helvetica, "Helvetica Neue", "Liberation Sans", sans-serif';

/** padding: top right bottom left — mais à esquerda empurra conteúdo para a direita no papel. */
export const CUPOM_PADDING_TERMICO = `3mm ${CUPOM_MARGEM_DIR_MM}mm 4mm ${CUPOM_MARGEM_ESQ_MM}mm`;

export const HTML2CANVAS_TERMICO = {
  scale: 2,
  useCORS: true,
  backgroundColor: '#ffffff',
  logging: false,
  imageTimeout: 15000,
  onclone: (doc) => {
    const root = doc.getElementById('cupom-print');
    if (root) {
      root.style.width = `${CUPOM_LARGURA_UTIL_MM}mm`;
      root.style.maxWidth = `${CUPOM_LARGURA_UTIL_MM}mm`;
      root.style.padding = CUPOM_PADDING_TERMICO;
      root.style.color = '#000000';
      root.style.background = '#ffffff';
      root.style.fontFamily = FONT_TERMICA;
      root.style.fontWeight = '600';
      root.style.boxSizing = 'border-box';
    }
  },
};

/** CSS injetado no iframe de impressão do navegador. */
export function buildCupom80PrintStyles() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${CUPOM_PAPEL_MM}mm;
      margin: 0;
      padding: 0;
      background: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      size: ${CUPOM_PAPEL_MM}mm auto;
      margin: 0;
    }
    #cupom-print {
      width: ${CUPOM_LARGURA_UTIL_MM}mm !important;
      max-width: ${CUPOM_LARGURA_UTIL_MM}mm !important;
      margin: 0 auto !important;
      padding: ${CUPOM_PADDING_TERMICO} !important;
      background: #fff !important;
      color: #000 !important;
      font-family: ${FONT_TERMICA} !important;
      font-weight: 600 !important;
      font-size: 13px !important;
      line-height: 1.35 !important;
      -webkit-font-smoothing: auto !important;
    }
    #cupom-print * {
      color: #000 !important;
      border-color: #000 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }
    #cupom-print img {
      filter: grayscale(100%) contrast(200%) !important;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  `;
}

/** HTML completo para impressão 80 mm (sem Google Fonts). */
export function wrapCupomHtmlForPrint(innerHtml, title = 'Cupom') {
  return `<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>${buildCupom80PrintStyles()}</style>
  </head><body>${innerHtml}</body></html>`;
}

/** PDF rasterizado: imagem 72 mm de largura, deslocada à direita no papel 80 mm. */
export function addCupomImageToPdf80(pdf, imgData, canvas) {
  const papelMm = CUPOM_PAPEL_MM;
  const conteudoMm = CUPOM_LARGURA_UTIL_MM;
  const offsetXMm = (papelMm - conteudoMm) / 2 + (CUPOM_MARGEM_ESQ_MM - CUPOM_MARGEM_DIR_MM) / 2;
  const heightMm = (canvas.height / canvas.width) * conteudoMm;
  pdf.addImage(imgData, 'PNG', Math.max(0, offsetXMm), 0, conteudoMm, heightMm);
  return heightMm;
}
