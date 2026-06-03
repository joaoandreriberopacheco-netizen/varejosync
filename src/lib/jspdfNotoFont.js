const NOTO_REGULAR_URL =
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
const NOTO_BOLD_URL =
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf';
const NOTO_MONO_LIGHT_URL =
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansMono/NotoSansMono-Light.ttf';
const NOTO_MONO_REGULAR_URL =
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansMono/NotoSansMono-Regular.ttf';

const fontCache = { regular: null, bold: null, monoLight: null, monoRegular: null };

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

/** Noto Sans Mono Light — tipografia fina estilo instrumento de precisão (relatórios mobile). */
export async function registerJsPdfPrecisionFonts(doc) {
  try {
    const [lightBase64, regularBase64] = await Promise.all([
      loadFontBase64(NOTO_MONO_LIGHT_URL, 'monoLight'),
      loadFontBase64(NOTO_MONO_REGULAR_URL, 'monoRegular'),
    ]);
    doc.addFileToVFS('NotoSansMono-Light.ttf', lightBase64);
    doc.addFont('NotoSansMono-Light.ttf', 'NotoSansMono', 'normal');
    doc.addFileToVFS('NotoSansMono-Regular.ttf', regularBase64);
    doc.addFont('NotoSansMono-Regular.ttf', 'NotoSansMono', 'bold');
    doc.setFont('NotoSansMono', 'normal');
    return 'NotoSansMono';
  } catch (err) {
    console.error('jspdfNotoFont: falha ao carregar Noto Sans Mono, fallback Noto Sans:', err);
    return registerJsPdfNotoFonts(doc);
  }
}

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
