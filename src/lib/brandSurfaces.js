/**
 * P38 — superfícies e ritmo visual (modo claro / escuro).
 *
 * Padrão de layout:
 * - Mobile: coluna única, cartões empilhados (vertical).
 * - md+ / telas grandes: grelhas horizontais onde o ecrã usa `md:grid` / `md:flex-row`.
 * - Ícones em contentores com raio fixo (`rounded-2xl` ou `rounded-[15px]`), já usado na Home.
 *
 * Modo escuro alinhado à Home: `bg-background`, cartões `bg-card` + `border-border` para contraste estável.
 */
export const brandSurface = {
  page: 'bg-gray-50 dark:bg-background',
  pageScreen: 'min-h-screen bg-gray-50 dark:bg-background',
  /** Cartão principal (equivalente a Home `dark:bg-card`) */
  card: 'bg-white shadow-sm dark:bg-card dark:text-card-foreground dark:border dark:border-border',
  /** Interior suave (equivalente a `dark:bg-muted/40` ou cinza claro) */
  cardInset: 'bg-gray-50 dark:bg-muted/35',
  /** Cápsula de ícone (atalhos Home) */
  iconCapsule: 'rounded-2xl bg-gray-100 dark:bg-muted flex items-center justify-center shadow-sm',
  textMuted: 'text-gray-500 dark:text-muted-foreground',
  textLabel: 'text-gray-400 dark:text-muted-foreground',
};
