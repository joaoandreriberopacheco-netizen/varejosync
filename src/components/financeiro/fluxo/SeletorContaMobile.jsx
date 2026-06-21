import { useMemo, useState } from 'react';
import { Search, Check, ChevronRight, Wallet } from 'lucide-react';

/**
 * Seletor de conta financeira otimizado para mobile — texto grande e lista tocável.
 */
export default function SeletorContaMobile({
  contas,
  value,
  onChange,
  label = 'Conta',
  placeholder = 'Selecionar conta',
  excludeIds = [],
}) {
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState(!value);

  const opcoes = useMemo(() => {
    const base = contas.filter((c) => !excludeIds.includes(c.id));
    const q = busca.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => (c.nome || '').toLowerCase().includes(q));
  }, [contas, busca, excludeIds]);

  const selecionada = contas.find((c) => c.id === value);

  const selecionar = (id) => {
    onChange(id);
    setBusca('');
    setExpandido(false);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="text-xs uppercase tracking-widest text-muted-foreground text-center">{label}</p>

      {selecionada && !expandido ? (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          className="w-full rounded-2xl bg-card shadow-sm p-4 flex items-center gap-3 active:scale-[0.99] transition-transform min-h-[72px]"
        >
          <span className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6 text-muted-foreground" />
          </span>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-lg font-semibold text-foreground truncate">{selecionada.nome}</p>
            <p className="text-sm text-muted-foreground">Toque para alterar</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              autoComplete="off"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar conta..."
              inputMode="search"
              enterKeyHint="search"
              className="w-full h-12 pl-11 pr-4 text-base rounded-2xl bg-muted text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40"
            />
          </div>

          <div className="flex flex-col gap-2 max-h-[min(42vh,320px)] overflow-y-auto overscroll-contain">
            {opcoes.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhuma conta encontrada</p>
            ) : (
              opcoes.map((c) => {
                const ativa = value === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selecionar(c.id)}
                    className={`w-full rounded-2xl px-4 py-4 flex items-center justify-between gap-3 text-left min-h-[60px] transition-colors ${
                      ativa ? 'bg-primary text-primary-foreground' : 'bg-card shadow-sm active:bg-muted'
                    }`}
                  >
                    <span className={`text-base font-semibold truncate ${ativa ? '' : 'text-foreground'}`}>
                      {c.nome}
                    </span>
                    {ativa && <Check className="w-5 h-5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {selecionada && (
            <button
              type="button"
              onClick={() => setExpandido(false)}
              className="text-sm text-muted-foreground text-center py-1"
            >
              Fechar lista
            </button>
          )}
        </>
      )}

      {!selecionada && !expandido && (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          className="w-full h-14 rounded-2xl border border-dashed border-border/50 text-base text-muted-foreground"
        >
          {placeholder}
        </button>
      )}
    </div>
  );
}
