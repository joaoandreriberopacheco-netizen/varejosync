import { cn } from '@/lib/utils';

const FORMA_STYLES = {
  dinheiro:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-700/50',
  pix: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-700/50',
  debito:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-700/50',
  credito:
    'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200/60 dark:border-violet-700/50',
  fiado:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200/60 dark:border-orange-700/50',
  vale:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-700/50',
  outro: 'bg-muted text-muted-foreground border-border/50',
};

function resolveFormaKey(forma) {
  const f = (forma || '').toLowerCase();
  if (f.includes('dinheiro')) return 'dinheiro';
  if (f === 'pix') return 'pix';
  if (f.includes('débito') || f.includes('debito')) return 'debito';
  if (f.includes('crédito') || f.includes('credito')) return 'credito';
  if (f.includes('conta a pagar') || f.includes('fiado')) return 'fiado';
  if (f.includes('vale')) return 'vale';
  return 'outro';
}

/** Rótulo curto para badge (ex.: Débito, Crédito 3x, Fiado). */
export function labelFormaPagamento(pag) {
  const forma = pag?.forma_pagamento || '';
  const parcelas = pag?.parcelas || 1;
  if (forma.includes('Crédito') && parcelas > 1) return `Crédito ${parcelas}x`;
  if (forma.includes('Cartão de Débito')) return 'Débito';
  if (forma.includes('Cartão de Crédito')) return 'Crédito';
  if (forma === 'Conta a Pagar') return 'Fiado';
  if (forma.includes('Vale')) return 'Vale';
  return forma || '?';
}

/**
 * Badges compactos das formas de pagamento de uma venda.
 * @param {{ pagamentos?: Array, className?: string, size?: 'xs'|'sm' }} props
 */
export default function FormaPagamentoBadges({ pagamentos = [], className, size = 'sm' }) {
  const pags = Array.isArray(pagamentos) ? pagamentos.filter((p) => p?.forma_pagamento) : [];
  if (pags.length === 0) return null;

  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0' : 'text-[11px] px-2 py-0.5';

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {pags.map((pag, idx) => {
        const key = resolveFormaKey(pag.forma_pagamento);
        return (
          <span
            key={`${pag.forma_pagamento}-${idx}`}
            className={cn(
              'inline-flex items-center rounded-full border font-medium leading-tight whitespace-nowrap',
              sizeClass,
              FORMA_STYLES[key],
            )}
            title={pag.forma_pagamento}
          >
            {labelFormaPagamento(pag)}
          </span>
        );
      })}
    </div>
  );
}
