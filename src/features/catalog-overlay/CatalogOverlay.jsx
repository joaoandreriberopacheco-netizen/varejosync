import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import overlayManifest from '@/generated/catalog-overlay-index.json';

const OVERLAY_STORAGE_KEY = 'p38_catalog_overlay_open';
const OVERLAY_Z = 10058;

function loadInitialState() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('catalogOverlay') === '1') return true;
    return localStorage.getItem(OVERLAY_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function collectBadges(index) {
  const nodes = Array.from(document.querySelectorAll('[data-source-location]'));
  const badges = [];
  const seen = new Set();

  for (const el of nodes) {
    const raw = el.getAttribute('data-source-location');
    if (!raw) continue;
    const item = index[raw];
    if (!item) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
    if (rect.right < 0 || rect.left > window.innerWidth) continue;

    // Avoid stacking repeated references on tiny nested nodes.
    const dedupeKey = `${item.short_code}:${Math.round(rect.left)}:${Math.round(rect.top)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    badges.push({
      short_code: item.short_code,
      code: item.code,
      kind: item.kind,
      hint: item.hint,
      top: Math.max(4, rect.top + window.scrollY),
      left: Math.max(4, rect.left + window.scrollX),
    });
  }

  return badges;
}

export default function CatalogOverlay() {
  const [open, setOpen] = useState(loadInitialState);
  const [badges, setBadges] = useState([]);

  const index = useMemo(() => overlayManifest?.index || {}, []);

  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.toggleCatalogOverlay = handler;

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
    return () => {
      window.removeEventListener('keydown', onKey, true);
      delete window.toggleCatalogOverlay;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(OVERLAY_STORAGE_KEY, open ? '1' : '0');
    } catch {
      // noop
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

  if (!open) return null;

  return createPortal(
    <>
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
        <div style={{ fontWeight: 600, color: '#7dffb3' }}>Catalog Overlay</div>
        <div style={{ opacity: 0.8 }}>{badges.length} componentes visíveis</div>
        <div style={{ opacity: 0.7 }}>Atalho: Ctrl+Alt+K</div>
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: OVERLAY_Z, pointerEvents: 'none' }}>
        {badges.map((badge) => (
          <div
            key={`${badge.short_code}:${badge.top}:${badge.left}`}
            title={`${badge.short_code} · ${badge.code}${badge.hint ? ` · ${badge.hint}` : ''}`}
            style={{
              position: 'absolute',
              top: badge.top,
              left: badge.left,
              transform: 'translateY(-100%)',
              background: 'rgba(14,24,19,0.95)',
              color: '#7dffb3',
              border: '1px solid #2f5c45',
              borderRadius: 6,
              padding: '2px 6px',
              fontSize: 11,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              maxWidth: 180,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}
          >
            {badge.short_code}
          </div>
        ))}
      </div>
    </>,
    document.body
  );
}
