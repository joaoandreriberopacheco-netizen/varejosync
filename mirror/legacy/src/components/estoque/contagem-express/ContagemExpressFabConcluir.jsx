import { CheckCircle2, Loader2 } from 'lucide-react';

export default function ContagemExpressFabConcluir({
  visivel,
  loading,
  totalItens = 0,
  onClick,
}) {
  if (!visivel) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="Concluir e salvar contagem"
      className="fixed right-4 z-[55] flex h-14 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60 p38-bottom-fab1 lg:right-6"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <CheckCircle2 className="h-5 w-5 shrink-0" />
      )}
      <span>Concluir</span>
      {totalItens > 0 && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-bold tabular-nums">
          {totalItens}
        </span>
      )}
    </button>
  );
}
