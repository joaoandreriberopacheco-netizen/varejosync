import React, { useRef, useCallback } from 'react';

export default function DesignerCampo({
  campo, isSelected, onSelect, onChange, onDelete,
  secaoAltura, docLargura
}) {
  const elRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  // ── Mover campo ─────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.target === resizeRef.current || resizeRef.current?.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const startCX = campo.x;
    const startCY = campo.y;

    const onMove = (me) => {
      const nx = Math.max(0, Math.min(docLargura - campo.w, startCX + me.clientX - startX));
      const ny = Math.max(0, Math.min(secaoAltura - campo.h, startCY + me.clientY - startY));
      onChange({ x: Math.round(nx), y: Math.round(ny) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [campo, onSelect, onChange, secaoAltura, docLargura]);

  // ── Redimensionar campo (canto inferior-direito) ──────────────────────────
  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = campo.w;
    const startH = campo.h;

    const onMove = (me) => {
      const nw = Math.max(20, Math.min(docLargura - campo.x, startW + me.clientX - startX));
      const nh = Math.max(10, Math.min(secaoAltura - campo.y, startH + me.clientY - startY));
      onChange({ w: Math.round(nw), h: Math.round(nh) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [campo, onSelect, onChange, secaoAltura, docLargura]);

  const isLinha = campo.campo_id === 'linha_separadora';

  return (
    <div
      ref={elRef}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{
        position: 'absolute',
        left: campo.x,
        top: campo.y,
        width: campo.w,
        height: campo.h,
        cursor: 'move',
        userSelect: 'none',
        boxSizing: 'border-box',
        border: isSelected
          ? '1.5px solid #3b82f6'
          : campo.border
            ? '1px solid #9ca3af'
            : '1px dashed #d1d5db',
        background: isSelected ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.8)',
        display: 'flex',
        alignItems: isLinha ? 'center' : 'flex-start',
        justifyContent: campo.align === 'right' ? 'flex-end' : campo.align === 'center' ? 'center' : 'flex-start',
        overflow: 'hidden',
        zIndex: isSelected ? 20 : 10,
      }}
      title={campo.label}
    >
      {isLinha ? (
        <div style={{ width: '100%', height: 1, background: '#374151' }} />
      ) : (
        <span
          style={{
            fontSize: campo.fontSize || 9,
            fontWeight: campo.bold ? 'bold' : 'normal',
            fontFamily: "'Cousine', monospace",
            color: '#374151',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '0 2px',
            width: '100%',
            textAlign: campo.align || 'left',
          }}
        >
          {campo.label}
        </span>
      )}

      {/* Handle de redimensionamento */}
      {isSelected && (
        <div
          ref={resizeRef}
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 10,
            height: 10,
            cursor: 'nwse-resize',
            background: '#3b82f6',
            borderRadius: '2px 0 0 0',
          }}
        />
      )}

      {/* Botão de deletar */}
      {isSelected && (
        <button
          onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 16,
            height: 16,
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            fontSize: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            zIndex: 30,
          }}
          title="Remover campo"
        >
          ×
        </button>
      )}
    </div>
  );
}