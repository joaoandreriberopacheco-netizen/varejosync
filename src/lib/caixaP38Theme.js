/**
 * Paleta P38 para o módulo de caixa — substitui emerald/blue/red genéricos.
 * success = oliva/limão (primary) · info = ciano · danger = destructive
 */
import { p38Accent } from '@/lib/p38ThemeSurfaces';

export const CAIXA_PRINT = {
  success: p38Accent.success.solid,
  info: p38Accent.info.solid,
  danger: p38Accent.danger.solid,
  warning: p38Accent.warning.solid,
  muted: '#9ca3af',
};

export const CAIXA_TOAST_SUCCESS = 'bg-primary/15 text-primary border border-primary/20';

const TONE_MAP = {
  emerald: 'success',
  green: 'success',
  blue: 'info',
  red: 'danger',
  amber: 'warning',
};

/** @param {'success'|'info'|'danger'|'warning'|string} tone */
export function normalizeCaixaTone(tone) {
  return TONE_MAP[tone] || tone || 'muted';
}

export const caixaTone = {
  success: {
    well: 'bg-primary/10 dark:bg-primary/15',
    icon: 'text-primary',
    text: p38Accent.success.text,
    panel: 'bg-primary/10 dark:bg-primary/15',
    panelText: p38Accent.success.text,
    btn: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    hover: 'hover:bg-primary/10 dark:hover:bg-primary/15',
    pill: 'bg-primary/10 text-primary',
    dot: p38Accent.success.dot,
  },
  info: {
    well: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    icon: p38Accent.info.text,
    text: p38Accent.info.text,
    panel: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    panelText: p38Accent.info.text,
    btn: 'bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600 text-white',
    hover: 'hover:bg-cyan-500/10 dark:hover:bg-cyan-500/15',
    pill: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    dot: p38Accent.info.dot,
  },
  danger: {
    well: 'bg-destructive/10 dark:bg-destructive/15',
    icon: p38Accent.danger.text,
    text: p38Accent.danger.text,
    panel: 'bg-destructive/10 dark:bg-destructive/15',
    panelText: p38Accent.danger.text,
    btn: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
    hover: 'hover:bg-destructive/10 dark:hover:bg-destructive/15',
    pill: 'bg-destructive/10 text-destructive',
    dot: p38Accent.danger.dot,
  },
  warning: {
    well: 'bg-amber-500/10 dark:bg-amber-500/15',
    icon: p38Accent.warning.text,
    text: p38Accent.warning.text,
    panel: 'bg-amber-500/10 dark:bg-amber-500/15',
    panelText: p38Accent.warning.text,
    btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    hover: 'hover:bg-amber-500/10 dark:hover:bg-amber-500/15',
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    dot: p38Accent.warning.dot,
  },
  muted: {
    well: 'bg-muted',
    icon: 'text-muted-foreground',
    text: 'text-foreground/90',
    panel: 'bg-muted',
    panelText: 'text-foreground/90',
    btn: 'bg-muted text-foreground',
    hover: 'hover:bg-muted',
    pill: 'bg-muted text-muted-foreground',
    dot: p38Accent.muted.dot,
  },
};

/** @param {string} tone */
export function caixaClasses(tone) {
  const key = normalizeCaixaTone(tone);
  return caixaTone[key] || caixaTone.muted;
}

/** Cor da timeline / movimento por tipo */
export function movimentoTone(tipo) {
  if (tipo === 'Reforço') return 'success';
  if (tipo === 'Despesa') return 'danger';
  return 'info';
}

/** Painel de conferência: ok | sobra | falta */
export function conferenciaTone({ temDiferenca, diferenca }) {
  if (!temDiferenca) return 'success';
  if (diferenca > 0) return 'info';
  return 'danger';
}
