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

/** Três assets oficiais em public/brand/ (modo claro: raster; escuro: composição em P38Logo). */
export const BRAND_ASSETS = {
  icon: '/brand/p38-app-icon.png',
  horizontal: '/brand/p38-logo-full.png',
  vertical: '/brand/p38-logo-mobile.png',
};

/**
 * Variante P38Logo por superfície da app.
 * Escuro: ícone PWA + tipografia (sem invert em JPEG/PNG com fundo branco).
 * Claro: PNG/JPEG oficial quando existir.
 */
export const BRAND_LOGO_SURFACES = {
  'sidebar.collapsed': { variant: 'icon-only', size: 'sm' },
  'sidebar.expanded': { variant: 'horizontal', size: 'md' },
  'sidebar.expandedMobile': { variant: 'mobile', size: 'md' },
  'home.headerDesktop': { variant: 'vertical', size: 'sm' },
  'home.headerMobile': { variant: 'vertical', size: 'xs' },
  'dashboard.header': { variant: 'vertical', size: 'sm' },
  'splash': { variant: 'vertical', size: 'xxl' },
  'navigation.transition': { variant: 'horizontal', size: 'lg' },
  'mobile.functionSelector': { variant: 'mobile', size: 'sm' },
};

/** @param {keyof typeof BRAND_LOGO_SURFACES} surface */
export function brandLogoProps(surface) {
  return BRAND_LOGO_SURFACES[surface] ?? { variant: 'horizontal', size: 'md' };
}

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
