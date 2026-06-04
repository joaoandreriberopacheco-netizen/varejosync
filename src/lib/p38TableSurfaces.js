/**
 * P38 Table Design System — origem: Relatório de Margem (mobile + desktop).
 * Irradia para ui/table, TreeGrid, vendas, produtos, financeiro, compras, etc.
 */

export const p38Table = {
  /** Contentor rolável com borda e fundo da página */
  shell: 'rounded-xl border border-border bg-background shadow-sm overflow-auto',
  shellFlat: 'rounded-lg border border-border bg-background overflow-hidden',

  /** thead sticky — cinza médio #2d333b (bg-card) */
  header: 'sticky top-0 z-30 backdrop-blur-sm bg-card text-white [&_tr]:border-b [&_tr]:border-border/40 dark:[&_tr]:border-white/10 [&_tr]:hover:bg-transparent',
  head: 'h-auto py-2 px-2 align-middle text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200/90',
  headSortable: 'cursor-pointer hover:text-foreground dark:hover:text-white',
  headRight: 'text-right',
  headCenter: 'text-center',

  /** Linhas de dados */
  row: 'border-b border-border/50 bg-background transition-colors hover:bg-secondary/25 dark:hover:bg-secondary/30',
  rowInteractive: 'cursor-pointer select-none',

  /** Células compactas (densidade ERP) */
  cell: 'py-1.5 px-2 align-middle text-sm',
  cellNumeric: 'tabular-nums text-right',
  cellMuted: 'text-muted-foreground',
  cellStrong: 'font-semibold text-foreground',
  cellAccent: 'font-semibold text-[#4A5D23] dark:text-[#a4ce33]',

  /** Colunas sticky (TreeGrid, catálogo) */
  stickyHead: 'sticky z-40 bg-card text-white',
  stickyHeadLeft: 'sticky left-0 z-40 bg-card text-white border-r border-border/40 dark:border-white/10',
  stickyCell: 'sticky z-20 bg-background border-r border-border/40 dark:border-white/10',
  stickyCellLeft: 'sticky left-0 z-20 bg-background',

  /** Painéis mobile / resumo */
  panel: 'bg-card text-white rounded-lg border border-border/40 dark:border-white/10',
  panelAccentBar: 'bg-[#4A5D23] dark:bg-[#a4ce33]',
  accentDot: 'w-1.5 h-1.5 rounded-full bg-[#4A5D23] dark:bg-[#a4ce33]',

  bodyText: 'text-[14px] font-din-1451',
  microText: 'text-xs',

  /** Linhas mobile compactas (substituem cards em smartphone) */
  mobileLine: 'border-b border-border/50 dark:border-white/10 border-l-2 py-3 pr-3 pl-4 min-w-0 bg-background font-din-1451',
  mobileLineInteractive: 'active:bg-secondary/30 cursor-pointer select-none min-h-[52px] touch-pan-y',
  mobileLineTitle: 'font-din-1451 font-medium text-[14px] uppercase tracking-wide text-foreground leading-tight break-words',
  mobileLineSubtitle: 'text-xs text-muted-foreground break-all mt-0.5 font-din-1451',
  mobileLineMeta: 'text-[10px] uppercase tracking-wide text-muted-foreground font-din-1451',
  mobileLineMetaInline: 'text-xs normal-case tracking-normal text-muted-foreground font-din-1451',
  mobileLineValue: 'font-semibold text-[14px] text-foreground text-right tabular-nums font-din-1451',
  mobileLineValueSub: 'text-[10px] text-muted-foreground text-right font-din-1451',
  mobileMicroLabel: 'text-[9px] uppercase tracking-wide text-muted-foreground leading-none font-din-1451',
  mobileListShell: 'md:hidden overflow-y-auto rounded-lg border border-border/40 dark:border-white/10 bg-background',
};

/** @deprecated Use p38Table — alias para migração gradual */
export const MARGIN_TABLE_PANEL = p38Table.panel;
export const MARGIN_TABLE_HEAD = p38Table.head;
export const MARGIN_TABLE_BORDER = 'border-border/40 dark:border-white/10';
export const MARGIN_TABLE_ROW = p38Table.row;
export const MARGIN_ACCENT_VALUE = p38Table.cellAccent;
export const MARGIN_MUTED_VALUE = p38Table.cellMuted;
export const MARGIN_BODY_TEXT = p38Table.bodyText;
export const MARGIN_TABLE_MICRO = p38Table.microText;
