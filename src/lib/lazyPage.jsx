import React, { lazy, Suspense } from 'react';

/** @deprecated Preferir lazy() directo com Suspense no router */
export function lazyPage(importFn) {
  return lazy(importFn);
}

export function PageLoadFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">
      A carregar…
    </div>
  );
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
