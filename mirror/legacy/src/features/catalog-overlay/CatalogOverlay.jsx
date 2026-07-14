import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Flag, Layers3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import overlayManifest from '@/generated/catalog-overlay-index.json';
import { createFlareEntry } from '@/features/modo-flare/flareQueue';

const OVERLAY_STORAGE_KEY = 'p38_catalog_overlay_open';
const OVERLAY_Z = 10058;
const LONG_PRESS_MS = 650;

function loadInitialState() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('catalogOverlay') === '1') return true;
    return localStorage.getItem(OVERLAY_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function normalizeToSrcPath(value) {
  const normalized = String(value || '').replace(/\\/g, '/');
  const marker = '/src/';
  const idx = normalized.lastIndexOf(marker);
  if (idx !== -1) return `src/${normalized.slice(idx + marker.length)}`;
  if (normalized.startsWith('src/')) return normalized;
  return normalized;
}

/** 7 chars, determinístico — alinhado ao espírito do manifesto quando não há linha AST */
function shortCodeFromLocationRaw(raw) {
  let h = 2166136261;
  const s = String(raw);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let n = h >>> 0;
  let base36 = n.toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (base36.length < 7) base36 = (n ^ 0x9e3779b9).toString(36).toUpperCase() + base36;
  return base36.replace(/[^A-Z0-9]/g, '').padStart(7, '0').slice(0, 7);
}

const NEAREST_LINE_MAX_DELTA = 48;

function makeUnmappedItem(domFile, match2, match3, rawAttr) {
  const key = `${domFile}:${match2}:${match3}`;
  return {
    source_location_raw: key,
    file: domFile,
    short_code: shortCodeFromLocationRaw(rawAttr),
    code: 'CAT-RUNTIME-NATIVO',
    kind: 'nativo',
    scope: 'sem-manifesto-AST',
    hint: 'Instrumentado no build (data-source-location), ainda sem linha no catálogo gerado.',
    unmapped: true,
  };
}

function collectBadges(index) {
  const nodes = Array.from(document.querySelectorAll('[data-source-location]'));
  const rawBadges = [];
  const seen = new Set();

  // Pré-indexa por ficheiro para conseguir aproximação por linha
  const itemsByFile = {};
  for (const item of Object.values(index || {})) {
    if (!item?.file) continue;
    const key = normalizeToSrcPath(item.file);
    if (!itemsByFile[key]) itemsByFile[key] = [];
    itemsByFile[key].push(item);
  }

  for (const el of nodes) {
    const rawAttr = el.getAttribute('data-source-location');
    if (!rawAttr) continue;

    const match = String(rawAttr).trim().match(/^(.+):(\d+):(\d+)$/);
    if (!match) continue;
    const domFile = normalizeToSrcPath(match[1]);
    const domLine = Number(match[2]);

    const candidates = itemsByFile[domFile];

    // Primeiro tenta match exato (incluindo coluna)
    let item = null;
    let bestDelta = Infinity;

    if (candidates?.length) {
      item = candidates.find((c) => c.source_location_raw === `${domFile}:${match[2]}:${match[3]}`);

      if (!item) {
        let best = null;
        for (const c of candidates) {
          const m2 = String(c.source_location_raw || '').match(/^.+:(\d+):\d+$/);
          if (!m2) continue;
          const line = Number(m2[1]);
          const delta = Math.abs(line - domLine);
          if (delta < bestDelta) {
            bestDelta = delta;
            best = c;
          }
        }
        if (best && bestDelta <= NEAREST_LINE_MAX_DELTA) {
          item = best;
        }
      } else {
        bestDelta = 0;
      }
    }

    if (!item) {
      item = makeUnmappedItem(domFile, match[2], match[3], rawAttr);
    }

    const unmapped = Boolean(item.unmapped);
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
    if (rect.right < 0 || rect.left > window.innerWidth) continue;

    // Avoid stacking repeated references on tiny nested nodes.
    const dedupeKey = `${item.short_code}:${Math.round(rect.left)}:${Math.round(rect.top)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    // Viewport coords only — matches getBoundingClientRect for both scrolled
    // document flow and position:fixed portals (dialogs, sheets).
    rawBadges.push({
      source_location_raw: item.source_location_raw,
      file: item.file,
      short_code: item.short_code,
      code: item.code,
      kind: item.kind,
      scope: item.scope,
      hint: item.hint,
      unmapped,
      top: Math.max(4, rect.top),
      left: Math.max(4, rect.left),
      targetTop: rect.top,
      targetLeft: rect.left,
      targetWidth: rect.width,
      targetHeight: rect.height,
    });
  }

  rawBadges.sort((a, b) => (a.top - b.top) || (a.left - b.left));

  const placed = [];
  return rawBadges.map((badge) => {
    let lane = 0;
    for (const prev of placed) {
      const nearX = Math.abs(prev.left - badge.left) < 56;
      const nearY = Math.abs(prev.top - badge.top) < 28;
      if (nearX && nearY) lane = Math.max(lane, (prev.lane || 0) + 1);
    }
    const next = {
      ...badge,
      lane,
      badgeTop: Math.max(4, badge.top - lane * 20),
      badgeLeft: badge.left + lane * 8,
    };
    placed.push(next);
    return next;
  });
}

export default function CatalogOverlay() {
  const { toast } = useToast();
  const [open, setOpen] = useState(loadInitialState);
  const [badges, setBadges] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('catalog');
  const longPressTimer = useRef(null);

  const index = useMemo(() => overlayManifest?.index || {}, []);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  const parseSourceLocation = useCallback((raw) => {
    const match = String(raw || '').trim().match(/^(.+):(\d+):(\d+)$/);
    if (!match) return { file_path: '', line: null, column: null, source_location_raw: raw || '' };
    return {
      file_path: match[1].replace(/\\/g, '/'),
      line: Number(match[2]),
      column: Number(match[3]),
      source_location_raw: raw,
    };
  }, []);

  const openPanelForBadge = useCallback((badge) => {
    setSelected(badge);
    setMode('catalog');
  }, []);

  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    const openHandler = () => setOpen(true);
    const closeHandler = () => setOpen(false);
    window.toggleCatalogOverlay = handler;
    window.openCatalogOverlay = openHandler;

    const onKey = (e) => {
      if (!e.ctrlKey || !e.altKey) return;
      if (e.key !== 'k' && e.key !== 'K') return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      handler();
    };

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('p38:open-catalog-overlay', openHandler);
    window.addEventListener('p38:close-catalog-overlay', closeHandler);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('p38:open-catalog-overlay', openHandler);
      window.removeEventListener('p38:close-catalog-overlay', closeHandler);
      delete window.toggleCatalogOverlay;
      delete window.openCatalogOverlay;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    if (document.documentElement.hasAttribute('data-flare-inspection')) {
      setOpen(false);
      return undefined;
    }
    const observer = new MutationObserver(() => {
      if (document.documentElement.hasAttribute('data-flare-inspection')) {
        setOpen(false);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-flare-inspection'] });
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    try {
      localStorage.setItem(OVERLAY_STORAGE_KEY, open ? '1' : '0');
    } catch {
      // noop
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setMode('catalog');
      setDraft('');
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setBadges([]);
      return;
    }

    let raf = 0;
    const refresh = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setBadges(collectBadges(index));
      });
    };

    refresh();
    window.addEventListener('scroll', refresh, true);
    window.addEventListener('resize', refresh);

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('scroll', refresh, true);
      window.removeEventListener('resize', refresh);
    };
  }, [open, index]);

  useEffect(() => {
    if (mode !== 'flare') return undefined;
    const onPopState = (e) => {
      e.preventDefault?.();
      toast({
        title: 'Feche o modo Flare para navegar',
        description: 'No Catalog você pode navegar; no Flare a navegação fica bloqueada até sair do registro.',
      });
      window.history.pushState({ p38_catalog_flare: 1 }, '');
    };
    window.history.pushState({ p38_catalog_flare: 1 }, '');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [mode, toast]);

  if (!open) return null;

  const handleCopy = async () => {
    if (!selected) return;
    const text = `${selected.short_code} | ${selected.code}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Código copiado', description: text });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const handleCreateFlare = async () => {
    if (!selected) return;
    const text = draft.trim();
    if (!text) {
      toast({ title: 'Descreva a malfuncionamento', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const parsed = parseSourceLocation(selected.source_location_raw);
      const created = await createFlareEntry(
        {
          ...parsed,
          component_name: selected.file?.split('/').pop()?.replace(/\.(jsx?|tsx?)$/i, '') || selected.kind,
          confidence: 'high',
          short_code: selected.short_code,
          catalog_code: selected.code,
          catalog_kind: selected.kind,
          catalog_scope: selected.scope,
          route: window.location.pathname || '',
        },
        text
      );
      toast({
        title: 'Malfuncionamento registrado',
        description: `Item ${selected.short_code} · origem: ${created.origin === 'remote' ? 'nuvem' : 'local'}`,
      });
      setDraft('');
      setMode('catalog');
    } catch {
      toast({ title: 'Falha ao registrar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const startMobileLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      setOpen((prev) => !prev);
      longPressTimer.current = null;
    }, LONG_PRESS_MS);
  };
  const stopMobileLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return createPortal(
    <>
      <div
        className="fixed right-3 top-[max(3.5rem,env(safe-area-inset-top)+2.5rem)] z-[10040] flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 shadow-sm backdrop-blur-sm opacity-75 transition-opacity hover:opacity-95 active:opacity-100 dark:bg-emerald-900/75 dark:text-emerald-200 desktop-layout:hidden"
        style={{ touchAction: 'none' }}
        onTouchStart={startMobileLongPress}
        onTouchEnd={stopMobileLongPress}
        onTouchCancel={stopMobileLongPress}
        onClick={() => setOpen((prev) => !prev)}
        title="Catalog overlay"
        aria-hidden
      >
        <Layers3 className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: OVERLAY_Z,
          background: 'rgba(10,13,17,0.92)',
          color: '#e8edf4',
          border: '1px solid #2f5c45',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 12,
          pointerEvents: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 600, color: '#7dffb3' }}>
            {mode === 'flare' ? 'Catalog + Flare' : 'Catalog Parts'}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{ all: 'unset', cursor: 'pointer', color: '#e8edf4', opacity: 0.75 }}
            aria-label="Fechar overlay"
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ opacity: 0.9 }}>{badges.length} alvos visíveis na telemetria</div>
        <div style={{ opacity: 0.7 }}>Atalho: Ctrl+Alt+K</div>
        <div style={{ opacity: 0.7 }}>
          {mode === 'flare'
            ? 'Flare ativo: feche o registro para voltar a navegar'
            : isMobile
              ? 'Toque no código para travar um alvo'
              : 'Clique no código para inspecionar e marcar melhoria'}
        </div>
      </div>
      {mode === 'flare' ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: OVERLAY_Z - 1,
            background: 'rgba(0,0,0,0.10)',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.preventDefault()}
        />
      ) : null}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: OVERLAY_Z,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        {badges.map((badge) => {
          const anchorX = badge.badgeLeft + 18;
          const anchorY = badge.badgeTop - 2;
          const targetX = badge.targetLeft + Math.min(24, badge.targetWidth / 2);
          const targetY = badge.targetTop + Math.min(16, badge.targetHeight / 2);
          const angle = Math.atan2(targetY - anchorY, targetX - anchorX) * (180 / Math.PI);
          const lineWidth = Math.max(10, Math.hypot(targetX - anchorX, targetY - anchorY));
          const um = Boolean(badge.unmapped);
          const lineGrad = um
            ? 'linear-gradient(90deg, rgba(255,196,107,0.95), rgba(255,196,107,0.12))'
            : 'linear-gradient(90deg, rgba(125,255,179,0.95), rgba(125,255,179,0.15))';
          const lineShadow = um ? '0 0 0 1px rgba(139,90,43,0.2)' : '0 0 0 1px rgba(47,92,69,0.12)';

          return (
            <React.Fragment key={badge.source_location_raw || `${badge.short_code}:${badge.badgeTop}:${badge.badgeLeft}`}>
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: anchorY,
                  left: anchorX,
                  width: lineWidth,
                  height: 1,
                  transformOrigin: '0 0',
                  transform: `rotate(${angle}deg)`,
                  background: lineGrad,
                  boxShadow: lineShadow,
                }}
              />
              <button
                type="button"
                onClick={() => openPanelForBadge(badge)}
                title={`${badge.short_code} · ${badge.code}${badge.hint ? ` · ${badge.hint}` : ''}`}
                style={{
                  position: 'absolute',
                  top: badge.badgeTop,
                  left: badge.badgeLeft,
                  transform: 'translateY(-100%)',
                  background: um ? 'rgba(40,28,10,0.96)' : 'rgba(14,24,19,0.95)',
                  color: um ? '#ffc46b' : '#7dffb3',
                  border: um ? '1px solid #8b5a2b' : '1px solid #2f5c45',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: 11,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  maxWidth: 180,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                }}
              >
                {badge.short_code}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      {selected ? (
        <div
          style={{
            position: 'fixed',
            right: isMobile ? 8 : 12,
            left: isMobile ? 8 : 'auto',
            bottom: isMobile ? 8 : 12,
            top: isMobile ? 'auto' : 72,
            width: isMobile ? 'auto' : 380,
            maxHeight: isMobile ? '50vh' : 'calc(100vh - 84px)',
            overflow: 'auto',
            zIndex: OVERLAY_Z + 2,
            background: 'rgba(10,13,17,0.96)',
            color: '#e8edf4',
            border: '1px solid #2f5c45',
            borderRadius: 12,
            padding: 12,
            boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
            <div>
              <div
                style={{
                  color: selected.unmapped ? '#ffc46b' : '#7dffb3',
                  fontWeight: 700,
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {selected.short_code}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {selected.kind}
                {selected.unmapped ? ' · fora do manifesto AST (ainda)' : ''}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setSelected(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.4, wordBreak: 'break-word' }}>
            <div style={{ color: '#e8c96b', fontFamily: 'ui-monospace, monospace' }}>{selected.code}</div>
            {selected.hint ? <div style={{ marginTop: 6, opacity: 0.82 }}>{selected.hint}</div> : null}
            {selected.unmapped ? (
              <div style={{ marginTop: 6, opacity: 0.78, color: '#ffc46b' }}>
                Este elemento está instrumentado no build, mas ainda não tem linha no catálogo gerado (import além do limite ou tipo não listado no AST).
                Depois de rodar <code className="text-xs">npm run catalogo:build-preview</code> com mais cobertura, o código pode virar verde.
              </div>
            ) : (
              <div style={{ marginTop: 6, opacity: 0.7 }}>
                Telemetria travada neste alvo. Use o código curto para falar do item e o código longo para localizar no catálogo.
              </div>
            )}
            {selected.source_location_raw ? (
              <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
                {selected.source_location_raw}
              </div>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar código
            </Button>
            {mode === 'catalog' ? (
              <Button type="button" onClick={() => setMode('flare')}>
                <Flag className="mr-2 h-4 w-4" />
                Marcar melhoria
              </Button>
            ) : null}
          </div>
          {mode === 'flare' ? (
            <>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Descreva a malfuncionamento deste item do catálogo..."
                className="mt-3 min-h-24 bg-black/20"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setMode('catalog')} disabled={saving}>
                  Voltar ao catalog
                </Button>
                <Button type="button" onClick={handleCreateFlare} disabled={saving}>
                  <Flag className="mr-2 h-4 w-4" />
                  {saving ? 'Registrando...' : 'Registrar malfuncionamento'}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </>,
    document.body
  );
}
