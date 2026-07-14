/**
 * Cores de shell (sidebar, menu mobile, home) — cinzas P38 do Relatório de Margem.
 * Evita #111827 / slate (tom azulado).
 */
export const P38_SHELL = {
  dark: {
    bg: '#1f1d22',
    headerBg: '#1f1d22',
    searchBg: '#282a2e',
    cardBg: '#2d333b',
    text: '#fafafa',
    textMuted: '#94949c',
    textSub: '#d1d5db',
    iconColor: '#94949c',
    chevron: '#6f7075',
    sectionLabel: '#6f7075',
    divider: 'rgba(255,255,255,0.06)',
    btnBg: 'rgba(255,255,255,0.08)',
    hoverBg: 'rgba(255,255,255,0.05)',
    activeBg: 'rgba(255,255,255,0.08)',
    backBg: '#282a2e',
    closeBg: 'rgba(255,255,255,0.08)',
    closeColor: '#ffffff',
    border: 'rgba(255,255,255,0.06)',
    subBorder: 'rgba(255,255,255,0.08)',
    accent: '#a4ce33',
  },
  light: {
    bg: '#fafafa',
    headerBg: '#fafafa',
    searchBg: '#f3f4f6',
    cardBg: '#ffffff',
    text: '#2a2f35',
    textMuted: '#5c6370',
    textSub: '#434a54',
    iconColor: '#5a6250',
    chevron: '#9ca3af',
    sectionLabel: '#8b9285',
    divider: 'rgba(0,0,0,0.06)',
    btnBg: 'rgba(74, 82, 64, 0.07)',
    hoverBg: 'rgba(0,0,0,0.03)',
    activeBg: 'rgba(74, 82, 64, 0.1)',
    backBg: '#f3f4f6',
    closeBg: '#e8eaed',
    closeColor: '#434a54',
    border: 'rgba(0,0,0,0.06)',
    subBorder: 'rgba(0,0,0,0.08)',
    accent: '#4a5240',
  },
};

export function getP38ShellColors(isDark) {
  return isDark ? P38_SHELL.dark : P38_SHELL.light;
}
