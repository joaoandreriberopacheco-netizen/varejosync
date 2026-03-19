import React, { useState } from 'react';
import EditorEtapa1 from '@/components/editor-layouts/EditorEtapa1';
import EditorEtapa2 from '@/components/editor-layouts/EditorEtapa2';
import EditorEtapa3 from '@/components/editor-layouts/EditorEtapa3';

export default function EditorLayoutsTres() {
  const [etapa, setEtapa] = useState(1);
  const [tipoDocumento, setTipoDocumento] = useState(null);
  const [blocksConfig, setBlocksConfig] = useState(null);

  const handleProximaEtapa = () => {
    if (etapa < 3) setEtapa(etapa + 1);
  };

  const handleEtapaAnterior = () => {
    if (etapa > 1) setEtapa(etapa - 1);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Etapa 1: Seletor */}
      {etapa === 1 && (
        <EditorEtapa1
          onSelecionado={(tipo) => {
            setTipoDocumento(tipo);
            handleProximaEtapa();
          }}
        />
      )}

      {/* Etapa 2: Edição */}
      {etapa === 2 && tipoDocumento && (
        <EditorEtapa2
          tipoDocumento={tipoDocumento}
          onBlocksChange={setBlocksConfig}
          onProximo={handleProximaEtapa}
          onVoltar={handleEtapaAnterior}
        />
      )}

      {/* Etapa 3: Salvar */}
      {etapa === 3 && tipoDocumento && blocksConfig && (
        <EditorEtapa3
          tipoDocumento={tipoDocumento}
          blocksConfig={blocksConfig}
          onVoltar={handleEtapaAnterior}
        />
      )}
    </div>
  );
}