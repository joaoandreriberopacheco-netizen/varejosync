import React, { useRef, useState, useCallback } from 'react';
import DesignerSecao from './DesignerSecao';

const SECOES_ORDEM = ['titulo', 'cabecalho', 'detalhe', 'rodape', 'sumario'];

const SECAO_CORES = {
  titulo: { bg: '#f0f4ff', border: '#c7d2fe', label: '#6366f1', text: 'Title' },
  cabecalho: { bg: '#fffbeb', border: '#fde68a', label: '#d97706', text: 'Page Header' },
  detalhe: { bg: '#f0fdf4', border: '#bbf7d0', label: '#16a34a', text: 'Detail' },
  rodape: { bg: '#faf5ff', border: '#e9d5ff', label: '#9333ea', text: 'Page Footer' },
  sumario: { bg: '#fff1f2', border: '#fecdd3', label: '#e11d48', text: 'Summary' },
};

export default function DesignerCanvas({ layout, onLayoutChange, camposDisponiveis }) {
  const canvasRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);

  // Adicionar campo ao canvas via drop
  const handleDrop = useCallback((e, secaoId) => {
    e.preventDefault();
    try {
      const campoData = JSON.parse(e.dataTransfer.getData('campo'));
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const secaoEl = e.currentTarget;
      const secaoRect = secaoEl.getBoundingClientRect();
      const x = Math.max(0, e.clientX - secaoRect.left - campoData.w / 2);
      const y = Math.max(0, e.clientY - secaoRect.top - 10);

      const novoCampo = {
        id: `${campoData.id}_${Date.now()}`,
        campo_id: campoData.id,
        label: campoData.label,
        secao: secaoId,
        x: Math.round(x),
        y: Math.round(y),
        w: campoData.w,
        h: campoData.h,
        fontSize: 9,
        bold: false,
        align: 'left',
        border: false,
      };

      onLayoutChange({
        ...layout,
        campos: [...(layout.campos || []), novoCampo],
      });
      setSelectedId(novoCampo.id);
    } catch {}
  }, [layout, onLayoutChange]);

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };

  const handleCampoChange = useCallback((campoId, changes) => {
    onLayoutChange({
      ...layout,
      campos: layout.campos.map(c => c.id === campoId ? { ...c, ...changes } : c),
    });
  }, [layout, onLayoutChange]);

  const handleCampoDelete = useCallback((campoId) => {
    onLayoutChange({
      ...layout,
      campos: layout.campos.filter(c => c.id !== campoId),
    });
    setSelectedId(null);
  }, [layout, onLayoutChange]);

  const handleSecaoAlturaChange = useCallback((secaoId, novaAltura) => {
    onLayoutChange({
      ...layout,
      secoes: {
        ...layout.secoes,
        [secaoId]: { ...layout.secoes[secaoId], altura: novaAltura },
      },
    });
  }, [layout, onLayoutChange]);

  const campoSelecionado = layout.campos?.find(c => c.id === selectedId);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Canvas principal */}
      <div className="flex-1 overflow-auto bg-muted dark:bg-background p-4">
        {/* Régua */}
        <Regua largura={layout.largura} />

        {/* Documento */}
        <div
          ref={canvasRef}
          style={{ width: layout.largura, background: '#fff', margin: '0 auto', position: 'relative' }}
          className="shadow-lg"
          onClick={() => setSelectedId(null)}
        >
          {SECOES_ORDEM.map(secaoId => {
            const secao = layout.secoes[secaoId];
            if (!secao) return null;
            const campos = (layout.campos || []).filter(c => c.secao === secaoId);
            const cores = SECAO_CORES[secaoId];
            return (
              <DesignerSecao
                key={secaoId}
                secaoId={secaoId}
                secao={secao}
                cores={cores}
                campos={campos}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCampoChange={handleCampoChange}
                onCampoDelete={handleCampoDelete}
                onAlturaChange={handleSecaoAlturaChange}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                docLargura={layout.largura}
              />
            );
          })}
        </div>
      </div>

      {/* Painel de propriedades */}
      {campoSelecionado && (
        <PropriedadesPanel
          campo={campoSelecionado}
          onChange={(changes) => handleCampoChange(selectedId, changes)}
          onDelete={() => handleCampoDelete(selectedId)}
        />
      )}
    </div>
  );
}

// ── Régua ─────────────────────────────────────────────────────────────────────
function Regua({ largura }) {
  const ticks = [];
  for (let i = 0; i <= largura; i += 10) {
    ticks.push(i);
  }
  return (
    <div
      style={{ width: largura, margin: '0 auto 2px', height: 18, position: 'relative', background: '#e5e7eb', fontSize: 8, color: '#9ca3af' }}
      className="select-none"
    >
      {ticks.map(t => (
        <div key={t} style={{ position: 'absolute', left: t, top: 0, borderLeft: '1px solid #d1d5db', height: t % 50 === 0 ? 12 : 6 }}>
          {t % 50 === 0 && <span style={{ position: 'absolute', left: 2, top: 6, fontSize: 7 }}>{t}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Painel de Propriedades ────────────────────────────────────────────────────
function PropriedadesPanel({ campo, onChange, onDelete }) {
  return (
    <div className="w-52 flex-shrink-0 bg-card border-l border-border/40 overflow-y-auto">
      <div className="p-3 border-b border-border/40">
        <div className="text-xs font-bold text-foreground/90 truncate">{campo.label}</div>
        <div className="text-[10px] text-muted-foreground">{campo.campo_id}</div>
      </div>
      <div className="p-3 space-y-3">
        {/* Posição */}
        <Grupo label="Posição">
          <PropRow label="X">
            <NumInput value={campo.x} onChange={v => onChange({ x: v })} min={0} />
          </PropRow>
          <PropRow label="Y">
            <NumInput value={campo.y} onChange={v => onChange({ y: v })} min={0} />
          </PropRow>
        </Grupo>
        {/* Tamanho */}
        <Grupo label="Tamanho">
          <PropRow label="Larg.">
            <NumInput value={campo.w} onChange={v => onChange({ w: v })} min={20} />
          </PropRow>
          <PropRow label="Alt.">
            <NumInput value={campo.h} onChange={v => onChange({ h: v })} min={10} />
          </PropRow>
        </Grupo>
        {/* Fonte */}
        <Grupo label="Fonte">
          <PropRow label="Tam.">
            <NumInput value={campo.fontSize || 9} onChange={v => onChange({ fontSize: v })} min={6} max={24} />
          </PropRow>
          <PropRow label="Bold">
            <input type="checkbox" checked={!!campo.bold} onChange={e => onChange({ bold: e.target.checked })} />
          </PropRow>
          <PropRow label="Alinha.">
            <select
              className="text-xs border border-border/40 rounded px-1 py-0.5 bg-card text-foreground/90 w-full"
              value={campo.align || 'left'}
              onChange={e => onChange({ align: e.target.value })}
            >
              <option value="left">Esq.</option>
              <option value="center">Centro</option>
              <option value="right">Dir.</option>
            </select>
          </PropRow>
        </Grupo>
        {/* Borda */}
        <Grupo label="Visual">
          <PropRow label="Borda">
            <input type="checkbox" checked={!!campo.border} onChange={e => onChange({ border: e.target.checked })} />
          </PropRow>
        </Grupo>

        <button
          onClick={onDelete}
          className="w-full text-xs text-red-500 hover:text-red-700 border border-red-200 rounded py-1 mt-2 transition-colors"
        >
          Excluir campo
        </button>
      </div>
    </div>
  );
}

function Grupo({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function PropRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="text-[11px] text-muted-foreground w-12 flex-shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, min, max }) {
  return (
    <input autoComplete="off"
      type="number"
      className="w-full text-xs border border-border/40 rounded px-1.5 py-0.5 bg-card text-foreground/90"
      value={value}
      min={min}
      max={max}
      onChange={e => onChange(Number(e.target.value))}
    />
  );
}