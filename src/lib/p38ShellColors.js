/**
 * Cores de shell (sidebar, menu mobile, home) — cinzas P38 do Relatório de Margem.
 * Evita #111827 / slate (tom azulado).
 */
export const P38_SHELL = {
  dark: {
    bg: '#2f3027',
    headerBg: '#2f3027',
    searchBg: '#35372e',
    cardBg: '#3e4034',
    text: '#f2f2e8',
    textMuted: '#a6a896',
    textSub: '#d8d9ce',
    iconColor: '#a6a896',
    chevron: '#8c916b',
    sectionLabel: '#8c916b',
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
    bg: '#f7f8f4',
    headerBg: '#f7f8f4',
    searchBg: '#ebece8',
    cardBg: '#ffffff',
    text: '#1a1f14',
    textMuted: '#5c6356',
    textSub: '#3d4238',
    iconColor: '#6b7264',
    chevron: '#9ca396',
    sectionLabel: '#9ca396',
    divider: 'rgba(0,0,0,0.06)',
    btnBg: 'rgba(0,0,0,0.04)',
    hoverBg: 'rgba(0,0,0,0.03)',
    activeBg: 'rgba(0,0,0,0.05)',
    backBg: '#ebece8',
    closeBg: '#e2e3df',
    closeColor: '#3d4238',
    border: 'rgba(0,0,0,0.06)',
    subBorder: 'rgba(0,0,0,0.08)',
    accent: '#636b33',
  },
};

export function getP38ShellColors(isDark) {
  return isDark ? P38_SHELL.dark : P38_SHELL.light;
}
