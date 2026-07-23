import React, { useEffect, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/utils';
import { p38Table } from '@/lib/p38TableSurfaces';
import { p38Accent } from '@/lib/p38ThemeSurfaces';
import { getLinhaAbcdLetter } from '@/lib/sugestaoCompraTree';
import {
  sugestaoProjecaoEstoque30dNegativa,
  sugestaoProjecaoEstoque30dTexto,
} from '@/lib/calcularSugestaoCompraVelocidade';
import { formatSugestaoEstoqueLinha } from '@/lib/sugestaoCompraVitrineDisplay';

const VALUES_GRID = 'grid grid-cols-3 gap-x-1.5 min-w-0';
const BODY_TEXT = 'font-din-1451 text-base tablet-landscape:text-lg font-light leading-none';
const HEADER_LABEL = `${BODY_TEXT} uppercase tracking-tight text-right text-muted-foreground min-w-0 truncate`;
const QTD_COL_W = '3.25rem';
const ROW_PL = 'pl-2.5';
const AXIS_LEFT = 'calc(0.625rem + 3.25rem)';
const DESC_PL_AFTER_LINE = 12;
const NOME_TYPO =
  'text-[12px] font-light leading-relaxed uppercase break-words [overflow-wrap:anywhere]';

function SacredAxis() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-[10] w-0 border-l border-border/50 dark:border-white/20"
      style={{ left: AXIS_LEFT }}
      aria-hidden
    />
  );
}

function QtdColShell({ children, className = '' }) {
  return (
    <div
      className={cn('relative shrink-0 pr-1.5 pt-3 pb-3 text-right self-stretch', className)}
      style={{ width: QTD_COL_W }}
    >
      {children}
    </div>
  );
}

function rowAccentKey(linha, selecionado) {
  if (selecionado) return 'info';
  const estoque = linha?.sugestao?.estoque_atual ?? linha?.produto?.estoque_atual ?? 0;
  if (estoque <= 0) return 'danger';
  if (sugestaoProjecaoEstoque30dNegativa(linha?.sugestao)) return 'warning';
  const gap = Number(linha?.sugestao?.gap_ponto_futuro_base);
  if (Number.isFinite(gap) && gap > 0) return 'warning';
  return 'muted';
}

function accentDotClass(key) {
  if (key === 'danger') return p38Accent.danger.dot;
  if (key === 'warning') return p38Accent.warning.dot;
  if (key === 'info') return p38Accent.info.dot;
  if (key === 'muted') return p38Accent.muted.dot;
  return p38Accent.success.dot;
}

function AbcdBadge({ letter }) {
  const value = String(letter || '').toUpperCase();
  if (!value) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[8px] font-bold bg-muted text-muted-foreground shrink-0">
      {value}
    </span>
  );
}

function SugestaoCompraMobileColumnHeader({ className = '', invisible = false, pinStyle = null }) {
  return (
    <div
      className={cn(
        p38Table.catalogMobileHeader,
        'relative',
        invisible && 'invisible pointer-events-none',
        pinStyle && 'fixed z-[60]',
        className,
      )}
      style={pinStyle || undefined}
    >
      <SacredAxis />
      <div className={cn('relative flex min-w-0 py-3.5 pr-10', ROW_PL)}>
        <QtdColShell className="!py-2">
          <p className={HEADER_LABEL}>QTD</p>
          <p className={cn(HEADER_LABEL, 'mt-1.5')}>UN</p>
        </QtdColShell>
        <div className="flex-1 min-w-0 overflow-hidden" style={{ paddingLeft: DESC_PL_AFTER_LINE }}>
          <div className={VALUES_GRID}>
            <p className={HEADER_LABEL}>EST.</p>
            <p className={HEADER_LABEL}>MÉD.</p>
            <p className={HEADER_LABEL}>P.FUT.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QtdInput({ linha, disp, onQuantidadeLinhaChange }) {
  const qty = disp?.quantidade ?? 0;
  const [localQty, setLocalQty] = useState(() => String(qty));

  useEffect(() => {
    setLocalQty(String(qty));
  }, [linha.id, qty]);

  const commit = () => {
    const parsed = Number(String(localQty).replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setLocalQty(String(qty));
      return;
    }
    onQuantidadeLinhaChange?.(linha, parsed);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={localQty}
      onChange={(e) => setLocalQty(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
          e.currentTarget.blur();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="h-auto min-h-0 w-full border-0 bg-transparent p-0 text-right shadow-none focus-visible:ring-0 font-din-1451 text-base font-light tabular-nums leading-none text-foreground"
    />
  );
}

function SugestaoCatalogRow({
  linha,
  disp,
  selecionado,
  onToggleSelecionado,
  onQuantidadeLinhaChange,
  fornecedorSelect,
  incluirPedidosAprovados,
}) {
  const sugestao = linha.sugestao;
  const produto = linha.produto;
  const isGrupo = linha.tipo === 'grupo';
  const estoqueFmt = formatSugestaoEstoqueLinha(produto, sugestao, {
    incluirPedidosAprovados,
    quantidadePendente: linha.quantidade_pendente,
  });
  const media30d = sugestao?.media_30d_texto || '—';
  const pontoFuturo = sugestaoProjecaoEstoque30dTexto(sugestao);
  const projNeg = sugestaoProjecaoEstoque30dNegativa(sugestao);
  const unidade = disp?.unidade || produto?.unidade_principal || 'UN';
  const abcd = getLinhaAbcdLetter(linha);
  const accent = rowAccentKey(linha, selecionado);

  return (
    <div
      className={cn(
        p38Table.catalogMobileRow,
        'relative flex min-w-0 max-w-full py-4',
        selecionado && 'bg-teal-50/40 dark:bg-teal-950/20',
      )}
    >
      <SacredAxis />
      <button
        type="button"
        className="flex flex-1 min-w-0 text-left active:bg-secondary/20"
        onClick={() => onToggleSelecionado?.(!selecionado)}
      >
        <div className={cn('flex flex-1 min-w-0 items-stretch', ROW_PL)}>
          <QtdColShell>
            <span className={cn('absolute left-0 top-3.5 h-1.5 w-1.5 rounded-full', accentDotClass(accent))} aria-hidden />
            <QtdInput
              linha={linha}
              disp={disp}
              onQuantidadeLinhaChange={onQuantidadeLinhaChange}
            />
            <p className={cn(BODY_TEXT, 'mt-1.5 uppercase text-muted-foreground truncate')}>{unidade}</p>
          </QtdColShell>

          <div
            className="flex-1 min-w-0 overflow-hidden py-1 pr-1"
            style={{ paddingLeft: DESC_PL_AFTER_LINE }}
          >
            <div className="min-h-[3rem] mb-2 min-w-0 overflow-hidden">
              <div className="flex items-start gap-1 min-w-0">
                <p lang="pt-BR" className={cn('line-clamp-3 flex-1 min-w-0', NOME_TYPO, 'text-foreground/90')}>
                  {linha.label}
                </p>
                <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                  <AbcdBadge letter={abcd} />
                  {isGrupo ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
                      <Layers className="w-2.5 h-2.5" />
                      {linha.skus?.length ?? 0}
                    </span>
                  ) : null}
                </div>
              </div>
              {!isGrupo && produto?.codigo_interno ? (
                <p className="mt-0.5 text-[10px] font-mono truncate text-muted-foreground">
                  #{produto.codigo_interno}
                </p>
              ) : null}
            </div>

            <div className={VALUES_GRID}>
              <p className={cn(BODY_TEXT, 'tabular-nums text-right truncate text-muted-foreground')}>
                {estoqueFmt.primary}
              </p>
              <p className={cn(BODY_TEXT, 'tabular-nums text-right truncate text-muted-foreground')}>
                {media30d}
              </p>
              <p
                className={cn(
                  BODY_TEXT,
                  'tabular-nums text-right truncate',
                  projNeg ? 'text-rose-600 dark:text-rose-400 font-normal' : 'text-muted-foreground',
                )}
              >
                {pontoFuturo}
              </p>
            </div>

            <div className="mt-2 min-w-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {fornecedorSelect}
            </div>
          </div>
        </div>
      </button>

      <div
        className="flex w-10 shrink-0 items-start justify-center pt-4 pr-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selecionado}
          onCheckedChange={(c) => onToggleSelecionado?.(!!c)}
          className="h-4 w-4"
        />
      </div>
    </div>
  );
}

function useColumnHeaderPin(scrollRef) {
  const sentinelRef = useRef(null);
  const [pinned, setPinned] = useState(false);
  const [pinFrame, setPinFrame] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const sync = () => {
      const scrollEl = scrollRef.current;
      const sentinelRect = sentinel.getBoundingClientRect();
      const usesInnerScroll = Boolean(scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight + 1);
      const scrollRect = scrollEl?.getBoundingClientRect();
      const anchorTop = usesInnerScroll && scrollRect ? scrollRect.top : 48;
      const anchorLeft = scrollRect?.left ?? 0;
      const anchorWidth = scrollRect?.width ?? window.innerWidth;

      setPinned(sentinelRect.top < anchorTop + 0.5);
      setPinFrame({ top: anchorTop, left: anchorLeft, width: anchorWidth });
    };

    const scrollEl = scrollRef.current;
    scrollEl?.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    const ro = new ResizeObserver(sync);
    if (scrollEl) ro.observe(scrollEl);
    ro.observe(sentinel);
    sync();

    return () => {
      scrollEl?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      ro.disconnect();
    };
  }, [scrollRef]);

  return { sentinelRef, pinned, pinFrame };
}

export function SugestaoCompraMobileScrollShell({ chrome, children }) {
  const scrollRef = useRef(null);
  const { sentinelRef, pinned, pinFrame } = useColumnHeaderPin(scrollRef);
  const pinStyle = pinned ? { top: pinFrame.top, left: pinFrame.left, width: pinFrame.width } : null;

  return (
    <div
      ref={scrollRef}
      className="flex flex-col flex-1 min-h-0 h-full w-full min-w-0 max-w-full overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y pb-[calc(var(--p38-bottom-nav-total,0px)+5.25rem)]"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {chrome}
      <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />
      <SugestaoCompraMobileColumnHeader
        className="border-x border-border/40 dark:border-white/10"
        invisible={pinned}
      />
      {pinned ? (
        <SugestaoCompraMobileColumnHeader
          className="border-x border-border/40 dark:border-white/10"
          pinStyle={pinStyle}
        />
      ) : null}
      <div className="min-w-0 max-w-full overflow-x-hidden">{children}</div>
    </div>
  );
}

export default function SugestaoCompraMobileCatalog({
  linhas = [],
  selectedItems = {},
  onToggleSelected,
  sugestaoDisplayLinha,
  onQuantidadeLinhaChange,
  renderFornecedorSelect,
  incluirPedidosAprovados = false,
}) {
  return (
    <>
      {linhas.map((linha) => (
        <SugestaoCatalogRow
          key={linha.id}
          linha={linha}
          disp={sugestaoDisplayLinha?.(linha)}
          selecionado={!!selectedItems[linha.id]}
          onToggleSelecionado={(checked) => onToggleSelected?.(linha.id, checked)}
          onQuantidadeLinhaChange={onQuantidadeLinhaChange}
          fornecedorSelect={renderFornecedorSelect?.(linha)}
          incluirPedidosAprovados={incluirPedidosAprovados}
        />
      ))}
    </>
  );
}
