import React, { useRef, useCallback } from 'react';
import DesignerCampo from './DesignerCampo';

const MIN_ALTURA = 30;

export default function DesignerSecao({
  secaoId, secao, cores, campos, selectedId,
  onSelect, onCampoChange, onCampoDelete,
  onAlturaChange, onDrop, onDragOver, docLargura
}) {
  const resizeRef = useRef(null);
  const secaoRef = useRef(null);

  // Redimensionar seção arrastando a borda inferior
  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = secao.altura;

    const onMove = (me) => {
      const delta = me.clientY - startY;
      onAlturaChange(secaoId, Math.max(MIN_ALTURA, startH + delta));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [secaoId, secao.altura, onAlturaChange]);

  return (
    <div style={{ position: 'relative', borderBottom: `1px solid ${cores.border}` }}>
      {/* Label da seção */}
      <div style={{
        background: cores.bg,
        borderTop: `1px solid ${cores.border}`,
        padding: '2px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        userSelect: 'none',
      }}>
        <span style={{ fontSize: 10, color: cores.label, fontWeight: 'bold' }}>▲ {cores.text}</span>
        <span style={{ fontSize: 9, color: '#9ca3af', marginLeft: 'auto' }}>{secao.altura}px</span>
      </div>

      {/* Área do canvas da seção */}
      <div
        ref={secaoRef}
        style={{
          position: 'relative',
          height: secao.altura,
          background: '#fff',
          overflow: 'hidden',
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '10px 10px',
        }}
        onDrop={(e) => onDrop(e, secaoId)}
        onDragOver={onDragOver}
        onClick={() => onSelect(null)}
      >
        {campos.map(campo => (
          <DesignerCampo
            key={campo.id}
            campo={campo}
            isSelected={selectedId === campo.id}
            onSelect={() => onSelect(campo.id)}
            onChange={(changes) => onCampoChange(campo.id, changes)}
            onDelete={() => onCampoDelete(campo.id)}
            secaoAltura={secao.altura}
            docLargura={docLargura}
          />
        ))}
      </div>

      {/* Handle de redimensionamento da seção */}
      <div
        ref={resizeRef}
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          cursor: 'row-resize',
          background: 'transparent',
          zIndex: 10,
        }}
        title="Arraste para redimensionar a seção"
      >
        <div style={{
          position: 'absolute',
          bottom: 1,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 40,
          height: 3,
          background: cores.border,
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}