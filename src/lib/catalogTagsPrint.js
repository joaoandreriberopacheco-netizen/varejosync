import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';

const TAG_WIDTH_CM = 4.3;
const TAG_HEIGHT_CM = 4.8;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const normalizeCodigo = (produto) => {
  const codigo = produto?.codigo_interno || produto?.codigo_barras || '';
  return String(codigo || '').trim();
};

const normalizeDescricao = (produto) => {
  const descricao = produto?.nome || '';
  return String(descricao || '').trim();
};

export function buildCatalogTagsPrintHtml({ products = [], filtrosResumo = '' } = {}) {
  const safeSummary = escapeHtml(filtrosResumo || 'Sem filtros');
  const cards = products
    .map((produto) => {
      const descricao = escapeHtml(normalizeDescricao(produto) || 'SEM DESCRIÇÃO');
      const codigo = escapeHtml(normalizeCodigo(produto) || 'SEM CÓDIGO');
      return `
        <article class="tag">
          <div class="hole-guide" aria-hidden="true"></div>
          <div class="content">
            <div class="descricao">${descricao}</div>
            <div class="codigo">${codigo}</div>
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Tags do Catálogo</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Inter, Arial, sans-serif;
            color: #111827;
          }
          .page-header {
            font-size: 11px;
            margin: 0 0 8mm 0;
            color: #4b5563;
          }
          .sheet {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(${TAG_WIDTH_CM}cm, 1fr));
            gap: 3.2mm;
          }
          .tag {
            width: ${TAG_WIDTH_CM}cm;
            height: ${TAG_HEIGHT_CM}cm;
            border: 0.35mm solid #111827;
            border-radius: 2.8mm;
            padding: 0.65cm 0.35cm 0.25cm 0.35cm;
            display: flex;
            flex-direction: column;
            position: relative;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .hole-guide {
            width: 3.2mm;
            height: 3.2mm;
            border: 0.25mm dashed #6b7280;
            border-radius: 9999px;
            position: absolute;
            top: 2.5mm;
            left: 50%;
            transform: translateX(-50%);
          }
          .content {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 2.5mm;
            min-height: 100%;
            text-align: center;
          }
          .descricao {
            font-size: 11.5pt;
            font-weight: 700;
            line-height: 1.12;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .codigo {
            font-size: 9.2pt;
            font-weight: 500;
            color: #374151;
            line-height: 1.1;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
        </style>
      </head>
      <body>
        <p class="page-header">
          Tags 4,3 x 4,8 cm (frente única) • ${products.length} item(ns) • ${safeSummary}
        </p>
        <section class="sheet">
          ${cards}
        </section>
      </body>
    </html>
  `;
}

export async function printCatalogTags({ products = [], filtrosResumo = '' } = {}) {
  const html = buildCatalogTagsPrintHtml({ products, filtrosResumo });
  return openPrintWindowOrShareHtml(html, 'tags-catalogo.html', 'Tags do catálogo', {
    closeAfterPrint: false,
    printDelayMs: 350,
  });
}
