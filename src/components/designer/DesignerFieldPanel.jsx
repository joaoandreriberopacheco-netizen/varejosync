import React, { useState } from 'react';

const SECAO_CORES = {
  titulo: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cabecalho: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  detalhe: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rodape: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  qualquer: 'bg-muted/40 text-muted-foreground dark:bg-muted dark:text-muted-foreground',
};

const SECAO_LABEL = {
  titulo: 'Title',
  cabecalho: 'Page Header',
  detalhe: 'Detail',
  rodape: 'Page Footer',
  qualquer: 'Qualquer seção',
};

export default function DesignerFieldPanel({ campos }) {
  const [busca, setBusca] = useState('');

  const handleDragStart = (e, campo) => {
    e.dataTransfer.setData('campo', JSON.stringify(campo));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const grupos = {};
  campos
    .filter(c => !busca || c.label.toLowerCase().includes(busca.toLowerCase()))
    .forEach(c => {
      if (!grupos[c.secao]) grupos[c.secao] = [];
      grupos[c.secao].push(c);
    });

  return (
    <div className="w-48 flex-shrink-0 bg-card border-r border-border/40 flex flex-col overflow-hidden">
      <div className="p-2 border-b border-border/40">
        <input autoComplete="off"
          className="w-full text-xs border border-border/40 rounded px-2 py-1 bg-card text-foreground/90 placeholder:text-muted-foreground"
          placeholder="Buscar campo..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.entries(grupos).map(([secao, cfields]) => (
          <div key={secao} className="mb-1">
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {SECAO_LABEL[secao] || secao}
            </div>
            {cfields.map(campo => (
              <div
                key={campo.id}
                draggable
                onDragStart={e => handleDragStart(e, campo)}
                className={`mx-1 mb-0.5 px-2 py-1 rounded text-[11px] cursor-grab active:cursor-grabbing select-none border border-transparent hover:border-border/40 dark:hover:border-border/40 transition-colors ${SECAO_CORES[campo.secao] || SECAO_CORES.qualquer}`}
                title={`Arraste para a seção: ${SECAO_LABEL[campo.secao] || campo.secao}`}
              >
                {campo.label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-border/40 text-[10px] text-muted-foreground text-center">
        Arraste para o canvas
      </div>
    </div>
  );
}