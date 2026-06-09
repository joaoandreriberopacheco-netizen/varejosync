/** Tokens P38 partilhados — fluxo de caixa e contas abertas. */
export const P38_CHIP_ACTIVE =
  'bg-[#4a5240] text-white dark:bg-[#a4ce33] dark:text-[#1f1d22]';
export const P38_CHIP_INACTIVE =
  'bg-secondary/80 text-muted-foreground dark:bg-[#26262e] dark:text-foreground/80 hover:bg-secondary dark:hover:bg-[#383e47]';
/** Superfície operacional — mesma cor da busca, altura automática (KPIs, pills, painéis). */
export const P38_FIELD_SURFACE = 'p38-field-surface border-0 shadow-none';
/** Campo de busca — inclui h-11 fixo; não usar em KPIs/listas. */
export const P38_SEARCH = 'p38-search-field border-0 shadow-none focus-visible:ring-1 focus-visible:ring-border/60';
export const P38_POPOVER =
  'border border-border/40 dark:border-white/10 shadow-xl rounded-2xl bg-card dark:bg-[#2d333b]';
export const P38_KPI_SHELL =
  `rounded-xl ${P38_FIELD_SURFACE} px-2.5 py-2 sm:px-3 sm:py-2.5`;
export const P38_ACCENT = 'text-[#4a5240] dark:text-[#a4ce33]';
