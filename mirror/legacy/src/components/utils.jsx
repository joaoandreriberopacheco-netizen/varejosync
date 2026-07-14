export { cn } from '@/lib/utils';
import { createPageUrl as createPageUrlBase } from '@/utils';

/** Rotas da app: delega a `@/utils` (espaços → hífen) e trata nome vazio. */
export function createPageUrl(pageName) {
  if (!pageName) return '/';
  return createPageUrlBase(pageName);
}
