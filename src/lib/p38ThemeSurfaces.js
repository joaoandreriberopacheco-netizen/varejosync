/**
 * Superfícies P38 — alinhado ao Relatório de Margem mobile (screenshot) e tokens em index.css.
 * Escuro: carvão #1a1b21, cartão #2d333b, busca #26262e, cabeçalho tabela #383e47, limão #a4ce33.
 * Claro: fundo suave + acento verde oliva.
 */

export const P38_THEME = {
  dark: {
    bg: '#1a1b21',
    headerBg: '#1a1b21',
    searchBg: '#26262e',
    cardBg: '#2d333b',
    tableHeaderBg: '#383e47',
    text: '#ffffff',
    textMuted: '#8b8b93',
    textSub: '#d1d5db',
    iconColor: '#8b8b93',
    chevron: '#6b7280',
    divider: 'rgba(255,255,255,0.06)',
    btnBg: '#26262e',
    backBg: '#26262e',
    closeBg: 'rgba(255,255,255,0.08)',
    closeColor: '#ffffff',
    accent: '#a4ce33',
  },
  light: {
    bg: '#f7f8f3',
    headerBg: '#ffffff',
    searchBg: '#eceee3',
    cardBg: '#ffffff',
    tableHeaderBg: '#eceee3',
    text: '#1e293b',
    textMuted: '#64748b',
    textSub: '#374151',
    iconColor: '#636b33',
    chevron: '#9ca3af',
    divider: '#e5e7eb',
    btnBg: 'rgba(79,85,41,0.06)',
    backBg: '#eceee3',
    closeBg: '#e5e7eb',
    closeColor: '#374151',
    accent: '#636b33',
  },
};

/** @param {boolean} isDark */
export function p38ThemeColors(isDark) {
  return isDark ? P38_THEME.dark : P38_THEME.light;
}
