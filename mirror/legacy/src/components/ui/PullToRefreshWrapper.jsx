import React from 'react';
import { RefreshCw } from 'lucide-react';
import usePullToRefresh from '@/components/utils/usePullToRefresh';

/**
 * Wrap a scrollable list with pull-to-refresh on mobile.
 * Usage: <PullToRefreshWrapper onRefresh={loadData}> ... </PullToRefreshWrapper>
 */
export default function PullToRefreshWrapper({ onRefresh, children, className = '' }) {
  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh(onRefresh);

  return (
    <div ref={containerRef} className={`relative overflow-auto ${className}`}>
      {/* Pull indicator */}
      <div
        className="md:hidden absolute left-0 right-0 flex items-center justify-center transition-all duration-150 z-10 pointer-events-none"
        style={{ top: -40 + pullDistance, opacity: pullDistance > 20 ? 1 : 0 }}
      >
        <div className={`flex items-center gap-2 bg-card shadow-sm rounded-full px-3 py-1.5 text-xs text-muted-foreground ${isRefreshing ? '' : ''}`}>
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : 'text-muted-foreground'}`} />
          <span>{isRefreshing ? 'Atualizando...' : 'Solte para atualizar'}</span>
        </div>
      </div>
      <div style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined, transition: pullDistance === 0 ? 'transform 0.2s ease' : undefined }}>
        {children}
      </div>
    </div>
  );
}