import React, { useCallback, useEffect, useState } from 'react';

const LS_KEY = 'varejosyncDebugDespacho';
const SS_KEY = 'varejosyncDebugDespachoSession';

/** Ative com ?debugDespacho=1 na URL (grava na sessão), localStorage varejosyncDebugDespacho=1, ou sessionStorage varejosyncDebugDespachoSession=1 */
export function isDespachoAuditEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage?.getItem(LS_KEY) === '1') return true;
    if (window.sessionStorage?.getItem(SS_KEY) === '1') return true;
    const q = new URLSearchParams(window.location.search);
    if (q.get('debugDespacho') === '1') {
      window.sessionStorage?.setItem(SS_KEY, '1');
      return true;
    }
  } catch {
    /* private mode */
  }
  return false;
}

export function logDespachoAudit(entry) {
  if (!isDespachoAuditEnabled()) return;
  const row = { t: new Date().toISOString(), ...entry };
  console.info('[DespachoAudit]', row);
  try {
    const w = window;
    w.__DESPACHO_AUDIT_LOG = w.__DESPACHO_AUDIT_LOG || [];
    w.__DESPACHO_AUDIT_LOG.push(row);
    if (w.__DESPACHO_AUDIT_LOG.length > 300) w.__DESPACHO_AUDIT_LOG = w.__DESPACHO_AUDIT_LOG.slice(-300);
    w.dispatchEvent(new CustomEvent('despacho-audit', { detail: row }));
  } catch {
    /* ignore */
  }
}

/** Faixa fixa com últimos eventos + copiar (só com auditoria ligada) */
export function InformarDespachoAuditStrip({ isOpen }) {
  const [enabled, setEnabled] = useState(false);
  const [lines, setLines] = useState(() => (typeof window !== 'undefined' ? window.__DESPACHO_AUDIT_LOG || [] : []));

  useEffect(() => {
    setEnabled(isDespachoAuditEnabled());
  }, [isOpen]);

  const onEvent = useCallback((e) => {
    setLines((prev) => [...prev.slice(-49), e.detail]);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    window.addEventListener('despacho-audit', onEvent);
    return () => window.removeEventListener('despacho-audit', onEvent);
  }, [enabled, onEvent]);

  if (!enabled || !isOpen) return null;

  const copy = () => {
    const text = JSON.stringify(window.__DESPACHO_AUDIT_LOG || lines, null, 2);
    navigator.clipboard?.writeText(text).then(() => console.info('[DespachoAudit] copiado')).catch(() => {});
  };

  return (
    <div className="fixed bottom-3 right-3 z-[10100] max-w-[min(100vw-1.5rem,22rem)] rounded-xl border border-emerald-500/40 bg-black/92 p-2 text-[10px] leading-tight text-emerald-200 shadow-2xl font-mono">
      <div className="mb-1 flex items-center justify-between gap-2 text-emerald-400">
        <span className="font-semibold uppercase tracking-wide">Auditoria despacho</span>
        <button type="button" onClick={copy} className="rounded bg-emerald-900/80 px-2 py-0.5 text-[9px] text-white hover:bg-emerald-800">
          Copiar log
        </button>
      </div>
      <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
        {lines.slice(-12).map((row, i) => (
          <div key={`${row.t}-${i}`} className="break-all opacity-95">
            {typeof row === 'object' ? JSON.stringify(row) : String(row)}
          </div>
        ))}
      </div>
      <p className="mt-1 text-[9px] text-emerald-600/90">
        URL ?debugDespacho=1 ou localStorage &quot;{LS_KEY}&quot; = 1
      </p>
    </div>
  );
}
