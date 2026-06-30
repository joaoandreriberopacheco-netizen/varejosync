import { abcdBadgeClassName } from '@/lib/catalogAbcdEnrichment';

export default function AbcdCatalogBadge({ letter, className = '' }) {
  const value = String(letter || '').toUpperCase().trim();
  if (!value) {
    return <span className={`text-xs text-muted-foreground ${className}`.trim()}>—</span>;
  }

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded text-[10px] font-bold tabular-nums ${abcdBadgeClassName(value)} ${className}`.trim()}
      title={`Curva ABCD: ${value}`}
    >
      {value}
    </span>
  );
}
