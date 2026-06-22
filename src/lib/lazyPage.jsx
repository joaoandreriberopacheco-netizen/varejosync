import React, { lazy, Suspense } from 'react';

const CHUNK_RELOAD_KEY = 'p38-chunk-reload';

/** Erros típicos de chunk/HMR desatualizado (Vite + preview Base44). */
export function isChunkLoadError(error) {
  const msg = error?.message || String(error || '');
  return (
    msg.includes('Failed to fetch dynamically imported module')
    || msg.includes('Importing a module script failed')
    || msg.includes('error loading dynamically imported module')
    || msg.includes('Failed to load module script')
    || msg.includes('dynamically imported module')
  );
}

export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    /* ignore */
  }
}

/** Recarrega a página uma vez por sessão quando um chunk falha (cache/HMR). */
export function reloadOnceOnChunkError() {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}

/** Envolve import dinâmico com retry via reload automático. */
export function wrapDynamicImport(importFn) {
  return async () => {
    try {
      const mod = await importFn();
      clearChunkReloadFlag();
      return mod;
    } catch (error) {
      if (isChunkLoadError(error) && reloadOnceOnChunkError()) {
        return new Promise(() => {});
      }
      throw error;
    }
  };
}

export function lazyPage(importFn) {
  return lazy(wrapDynamicImport(importFn));
}

export function PageLoadFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      A carregar…
    </div>
  );
}

export function ChunkLoadErrorScreen({ onRetry }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-base font-medium text-foreground">Não foi possível carregar esta página</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Isso costuma acontecer após uma atualização no preview. Recarregue para buscar a versão mais recente.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-2xl bg-[#4a5240] px-5 py-2.5 text-sm font-semibold text-white dark:bg-[#a4ce33] dark:text-[#1f1d22]"
      >
        Recarregar página
      </button>
    </div>
  );
}

export class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error) && reloadOnceOnChunkError()) {
      return;
    }
    console.error('[ChunkErrorBoundary]', error);
  }

  render() {
    const { error } = this.state;
    if (error) {
      if (isChunkLoadError(error)) {
        return (
          <ChunkLoadErrorScreen
            onRetry={() => {
              clearChunkReloadFlag();
              window.location.reload();
            }}
          />
        );
      }
      throw error;
    }
    return this.props.children;
  }
}

export function withPageSuspense(LazyComponent) {
  function SuspendedPage(props) {
    return (
      <Suspense fallback={<PageLoadFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }
  SuspendedPage.displayName = `Suspended(${LazyComponent.displayName || LazyComponent.name || 'Page'})`;
  return SuspendedPage;
}
