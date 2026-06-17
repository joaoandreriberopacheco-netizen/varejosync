import React from 'react';
import { createPortal } from 'react-dom';
import GlobalSearchBar from '@/components/navigation/GlobalSearchBar';
import { SHELL_Z } from '@/lib/quickAccessOverlay';

/**
 * Busca global (Ctrl+K / bottom nav) — portal no body para prevalecer sobre qualquer tela.
 */
export default function GlobalSearchOverlay({
  open,
  onClose,
  isMobile,
  isDark,
  searchableItems,
  onNavigate,
}) {
  if (!open || typeof document === 'undefined') return null;

  const shellZ = SHELL_Z.search;

  if (isMobile) {
    return createPortal(
      <div
        className="fixed inset-0 font-din-1451 desktop-layout:hidden"
        style={{ zIndex: shellZ }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Busca de funcionalidades"
      >
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-hidden />
        <div
          className="relative z-[1] w-full px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]"
          onClick={(e) => e.stopPropagation()}
        >
          <GlobalSearchBar
            isDark={isDark}
            searchableItems={searchableItems}
            autoFocus
            showClose
            atTop
            onClose={onClose}
            onNavigate={onNavigate}
          />
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 bg-black/25 backdrop-blur-[1px]"
        style={{ zIndex: shellZ }}
        aria-label="Fechar busca"
        onClick={onClose}
      />
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-3 font-din-1451 pointer-events-none"
        style={{ zIndex: shellZ }}
      >
        <div className="pointer-events-auto">
          <GlobalSearchBar
            isDark={isDark}
            searchableItems={searchableItems}
            autoFocus
            showClose
            onClose={onClose}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </>,
    document.body
  );
}
