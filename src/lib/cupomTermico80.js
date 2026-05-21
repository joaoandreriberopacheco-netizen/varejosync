/**
 * Cupom térmico 80 mm — bobina 80 mm, área útil ~72 mm.
 * Padding assimétrico (esquerda > direita) compensa desvio comum à esquerda na impressora.
 */

export const CUPOM_PAPEL_MM = 80;
export const CUPOM_LARGURA_UTIL_MM = 72;

const MM_TO_PX_96 = 96 / 25.4;
export const CUPOM_LARGURA_UTIL_PX = Math.round(CUPOM_LARGURA_UTIL_MM * MM_TO_PX_96);

/** top right bottom left — esquerda maior que direita */
export const CUPOM_PADDING_TERMICO = '2.5mm 1.8mm 3mm 2.8mm';

/** Estica só na vertical — largura útil 72 mm inalterada; melhora legibilidade em térmica. */
export const CUPOM_SCALE_Y = 1.08;

export const CUPOM_LINE_HEIGHT_TERMICO = 1.42;

export const FONT_TERMICA =
  "'Arial Narrow', 'Helvetica Neue', Helvetica, Arial, 'Liberation Sans Narrow', system-ui, sans-serif";

/** scaleY no #cupom-print (térmico); não usar em variant A4. */
export const estiloEscalaVerticalCupomTermico = {
  transform: `scaleY(${CUPOM_SCALE_Y})`,
  transformOrigin: 'top center',
};

export const HTML2CANVAS_TERMICO = {
  scale: 2,
  useCORS: true,
  backgroundColor: '#ffffff',
  logging: false,
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapCupomHtmlForPrint(bodyHtml, title = 'Cupom') {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${safeTitle}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: ${CUPOM_PAPEL_MM}mm auto; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff !important;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #cupom-print {
    width: ${CUPOM_LARGURA_UTIL_MM}mm;
    max-width: ${CUPOM_LARGURA_UTIL_MM}mm;
    margin: 0 auto;
    background: #fff !important;
    color: #000 !important;
    font-family: ${FONT_TERMICA};
    line-height: ${CUPOM_LINE_HEIGHT_TERMICO};
    transform: scaleY(${CUPOM_SCALE_Y});
    transform-origin: top center;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #cupom-print, #cupom-print * {
    color: #000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #cupom-print img {
    filter: grayscale(100%) contrast(200%) !important;
    max-width: 58mm;
  }
</style></head><body>${bodyHtml}</body></html>`;
}

/** Centraliza imagem do cupom na bobina 80 mm (conteúdo 72 mm). */
export function addCupomImageToPdf80(pdf, imgData, canvas) {
  const conteudoMm = CUPOM_LARGURA_UTIL_MM;
  const heightMm = (canvas.height / canvas.width) * conteudoMm;
  const xOffset = (CUPOM_PAPEL_MM - conteudoMm) / 2;
  pdf.addImage(imgData, 'PNG', xOffset, 4, conteudoMm, heightMm);
}
