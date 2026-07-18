import { jsPDF } from 'jspdf';
import { normalizePdfText, registerJsPdfNotoFonts } from '@/lib/jspdfNotoFont';
import { TIPO_VINCULO, TIPO_VINCULO_LABELS } from '@/lib/folhaPrevisaoCalculos';

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 15;
const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2;
const BLACK = [0, 0, 0];

const FONT_TITLE = 16;
const FONT_SUBTITLE = 10;
const FONT_SECTION = 12;
const FONT_BODY = 10;
const LINE_H_BODY = 5;
const LINE_H_SECTION = 7;
const GAP_AFTER_SECTION = 4;

function resolvePessoaLinha(pessoa, colaboradoresMap = {}) {
  const nome =
    colaboradoresMap[pessoa?.colaborador_id]?.nome ||
    pessoa?.colaborador_nome ||
    pessoa?.nome ||
    'Pessoa';
  const tipo =
    TIPO_VINCULO_LABELS[pessoa?.tipo_vinculo || TIPO_VINCULO.FUNCIONARIO] ||
    TIPO_VINCULO_LABELS[TIPO_VINCULO.FUNCIONARIO];
  return { nome: normalizePdfText(nome), tipo: normalizePdfText(tipo) };
}

export function montarSecoesFolhaPessoasPorCentro({
  centrosRegistrados = [],
  pessoasPorCentro = {},
  colaboradoresMap = {},
}) {
  const chaves = [...(centrosRegistrados || []), '__sem__'];
  return chaves
    .map((centro) => {
      const chave = centro || '__sem__';
      const pessoas = pessoasPorCentro[chave] || [];
      if (!pessoas.length) return null;
      return {
        chave,
        titulo: chave === '__sem__' ? 'Sem centro de custo' : normalizePdfText(centro),
        linhas: pessoas.map((pessoa) => {
          const { nome, tipo } = resolvePessoaLinha(pessoa, colaboradoresMap);
          return `${nome} — ${tipo}`;
        }),
      };
    })
    .filter(Boolean);
}

function ensurePageSpace(doc, y, neededMm) {
  if (y + neededMm <= PAGE_H_MM - MARGIN_MM) return y;
  doc.addPage('a4', 'portrait');
  return MARGIN_MM;
}

export async function generateFolhaPessoasPorCentroPdf({
  centrosRegistrados = [],
  pessoasPorCentro = {},
  colaboradoresMap = {},
  filtroVinculoLabel = 'Todos',
} = {}) {
  const secoes = montarSecoesFolhaPessoasPorCentro({
    centrosRegistrados,
    pessoasPorCentro,
    colaboradoresMap,
  });

  if (!secoes.length) {
    throw new Error('Nenhuma pessoa cadastrada para gerar o PDF.');
  }

  const totalPessoas = secoes.reduce((acc, sec) => acc + sec.linhas.length, 0);
  const geradoEm = new Date().toLocaleString('pt-BR');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.setProperties({
    title: 'Folha — Pessoas por centro de custo',
    subject: `Funcionários e sócios (${filtroVinculoLabel})`,
    creator: 'P38 ERP',
  });

  const fontFamily = await registerJsPdfNotoFonts(doc);
  doc.setTextColor(...BLACK);

  let y = MARGIN_MM;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(FONT_TITLE);
  doc.text('Folha — Pessoas por centro de custo', MARGIN_MM, y);
  y += LINE_H_SECTION + 1;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(FONT_SUBTITLE);
  doc.text(`Filtro: ${normalizePdfText(filtroVinculoLabel)} · ${totalPessoas} pessoa(s)`, MARGIN_MM, y);
  y += LINE_H_BODY;
  doc.text(`Gerado em ${normalizePdfText(geradoEm)}`, MARGIN_MM, y);
  y += LINE_H_SECTION;

  for (const secao of secoes) {
    y = ensurePageSpace(doc, y, LINE_H_SECTION + LINE_H_BODY);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(FONT_SECTION);
    doc.setTextColor(...BLACK);
    doc.text(secao.titulo, MARGIN_MM, y);
    y += LINE_H_SECTION;

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(FONT_BODY);
    for (const linha of secao.linhas) {
      const wrapped = doc.splitTextToSize(linha, CONTENT_W_MM);
      const blockH = wrapped.length * LINE_H_BODY;
      y = ensurePageSpace(doc, y, blockH);
      doc.setTextColor(...BLACK);
      doc.text(wrapped, MARGIN_MM + 2, y);
      y += blockH;
    }

    y += GAP_AFTER_SECTION;
  }

  return doc.output('blob');
}
