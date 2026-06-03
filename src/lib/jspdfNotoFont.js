const NOTO_REGULAR_URL =
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
const NOTO_BOLD_URL =
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf';

const PDF_FONT_ASSET_BASE = `${import.meta.env.BASE_URL || '/'}fonts/dinish/`;
const DIN1451_LIGHT_URL = `${PDF_FONT_ASSET_BASE}DINish-Light.ttf`;
const DIN1451_REGULAR_URL = `${PDF_FONT_ASSET_BASE}DINish-Regular.ttf`;

const fontCache = { regular: null, bold: null, dinLight: null, dinRegular: null };

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const loadFontBase64 = async (url, cacheKey) => {
  if (fontCache[cacheKey]) return fontCache[cacheKey];
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erro ao carregar fonte ${cacheKey}`);
  const base64 = arrayBufferToBase64(await response.arrayBuffer());
  fontCache[cacheKey] = base64;
  return base64;
};

/** Registra Noto Sans no jsPDF; retorna família activa ('NotoSans' ou 'helvetica'). */
export async function registerJsPdfNotoFonts(doc) {
  try {
    const [regularBase64, boldBase64] = await Promise.all([
      loadFontBase64(NOTO_REGULAR_URL, 'regular'),
      loadFontBase64(NOTO_BOLD_URL, 'bold'),
    ]);
    doc.addFileToVFS('NotoSans-Regular.ttf', regularBase64);
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.addFileToVFS('NotoSans-Bold.ttf', boldBase64);
    doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
    doc.setFont('NotoSans', 'normal');
    return 'NotoSans';
  } catch (err) {
    console.error('jspdfNotoFont: falha ao carregar Noto Sans, usando Helvetica:', err);
    doc.setFont('helvetica', 'normal');
    return 'helvetica';
  }
}

/**
 * DIN 1451 Light (via DINish Light, OFL) — relatório mobile de margem.
 * Retorna família jsPDF `DIN1451` ou fallback Noto Sans.
 */
export async function registerJsPdfDin1451Fonts(doc) {
  try {
    const [lightBase64, regularBase64] = await Promise.all([
      loadFontBase64(DIN1451_LIGHT_URL, 'dinLight'),
      loadFontBase64(DIN1451_REGULAR_URL, 'dinRegular'),
    ]);
    doc.addFileToVFS('DINish-Light.ttf', lightBase64);
    doc.addFont('DINish-Light.ttf', 'DIN1451', 'normal');
    doc.addFileToVFS('DINish-Regular.ttf', regularBase64);
    doc.addFont('DINish-Regular.ttf', 'DIN1451', 'bold');
    doc.setFont('DIN1451', 'normal');
    return 'DIN1451';
  } catch (err) {
    console.error('jspdfNotoFont: falha ao carregar DIN 1451 (DINish), fallback Noto Sans:', err);
    return registerJsPdfNotoFonts(doc);
  }
}

/** @deprecated Use registerJsPdfDin1451Fonts */
export const registerJsPdfPrecisionFonts = registerJsPdfDin1451Fonts;

/** Normaliza texto para PDF (Unicode NFC, aspas e travessões). */
export function normalizePdfText(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .normalize('NFC')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '-');
}
