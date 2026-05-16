/**
 * Smoke test: gera PDF mínimo com a paleta do relatório expandido de embarques.
 * Uso: node scripts/test-margem-pdf-smoke.mjs
 */
import { jsPDF } from 'jspdf';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'relatorio_margem_smoke.pdf');

const C = {
  text: [31, 41, 55],
  muted: [107, 114, 128],
  panel: [248, 250, 252],
  dark: [17, 24, 39],
  white: [255, 255, 255],
  teal: [45, 212, 191],
  kpiBg: [250, 250, 250],
  profit: [15, 118, 110],
};

const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const M = 14;
const CW = pdf.internal.pageSize.getWidth() - M * 2;
let y = M;

pdf.setFillColor(...C.panel);
pdf.roundedRect(M, y, CW, 22, 4, 4, 'F');
pdf.setFillColor(...C.teal);
pdf.roundedRect(M + 5, y + 5, 2.4, 10, 1.2, 1.2, 'F');
pdf.setFont('helvetica', 'normal');
pdf.setFontSize(15);
pdf.setTextColor(...C.text);
pdf.text('Relatório de Margem de Vendas', M + 11, y + 9);
y += 28;

const segs = 4;
const segW = (CW - 3.6) / segs;
for (let s = 0; s < segs; s++) {
  pdf.setFillColor(...(s < 3 ? C.teal : [220, 225, 230]));
  pdf.roundedRect(M + s * (segW + 1.2), y, segW, 1.5, 0.75, 0.75, 'F');
}
y += 6;

const kpis = [
  { label: 'Receita líquida', value: '12.345,67' },
  { label: 'Lucro', value: '2.100,00', accent: true },
];
const boxW = (CW - 4) / 2;
kpis.forEach((kpi, i) => {
  const x = M + i * (boxW + 4);
  pdf.setFillColor(...C.kpiBg);
  pdf.roundedRect(x, y, boxW, 18, 3, 3, 'F');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...C.muted);
  pdf.text(kpi.label, x + 4, y + 6);
  pdf.setFontSize(10);
  pdf.setTextColor(...(kpi.accent ? C.profit : C.dark));
  pdf.text(kpi.value, x + 4, y + 13);
});
y += 24;

pdf.setFillColor(...C.dark);
pdf.roundedRect(M, y, CW, 7.5, 2, 2, 'F');
pdf.setFontSize(6.5);
pdf.setTextColor(...C.white);
pdf.text('DESCRIÇÃO', M + 2, y + 4.8);
pdf.text('LUCRO', M + CW - 2, y + 4.8, { align: 'right' });
y += 10;

pdf.setFillColor(...C.panel);
pdf.roundedRect(M + 1.5, y, CW - 3, 6, 3, 3, 'F');
pdf.setFillColor(...C.teal);
pdf.roundedRect(M + 4.5, y + 2, 1.2, 4, 0.6, 0.6, 'F');
pdf.setTextColor(...C.text);
pdf.setFontSize(7.5);
pdf.text('GRUPO A (3)', M + 8, y + 4.2);

const buf = pdf.output('arraybuffer');
writeFileSync(outPath, Buffer.from(buf));
console.log('OK:', outPath);
