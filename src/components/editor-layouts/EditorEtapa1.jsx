import React, { useState, useEffect } from 'react';
import { ChevronRight, Plus, Loader } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const ICON_CATEGORIA = {
  comprovante: '📄',
  protocolo: '✓',
  nota_fiscal: '📋',
  manifesto: '📦',
  relatorio: '📊',
  outro: '🔧',
};

export default function EditorEtapa1({ onSelecionado }) {
  const [documentos, setDocumentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showNovo, setShowNovo] = useState(false);

  useEffect(() => {
    carregarDocumentos();
  }, []);

  const carregarDocumentos = async () => {
    try {
      setIsLoading(true);
      const docs = await base44.entities.LayoutTemplate.list('-updated_date', 100);
      setDocumentos(docs);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filtrados = documentos.filter(doc =>
    doc.nome.toLowerCase().includes(busca.toLowerCase()) ||
    doc.categoria.toLowerCase().includes(busca.toLowerCase())
  );

  const handleNovoDocumento = () => {
    setShowNovo(true);
  };

  // Tela de novo documento (seleção de tipo base)
  if (showNovo) {
    const TIPOS_BASE = [
      { id: 'comprovante', nome: 'Comprovante', descricao: 'Comprovante de venda/compra' },
      { id: 'protocolo', nome: 'Protocolo', descricao: 'Protocolo de entrega' },
      { id: 'nota_fiscal', nome: 'Nota Fiscal', descricao: 'Nota fiscal eletrônica' },
      { id: 'manifesto', nome: 'Manifesto', descricao: 'Manifesto de carga' },
      { id: 'relatorio', nome: 'Relatório', descricao: 'Relatório gerencial' },
      { id: 'outro', nome: 'Outro', descricao: 'Documento customizado' },
    ];

    return (
      <div className="flex-1 flex flex-col p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Novo Documento
            </h1>
            <p className="text-muted-foreground text-sm">
              Escolha o tipo base
            </p>
          </div>
          <Button variant="ghost" onClick={() => setShowNovo(false)}>
            ← Voltar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TIPOS_BASE.map(tipo => (
            <button
              key={tipo.id}
              onClick={() => onSelecionado({ ...tipo, isNovo: true })}
              className="p-4 text-left rounded-lg bg-muted/50 hover:bg-muted border border-border/40 transition"
            >
              <div className="text-2xl mb-2">{ICON_CATEGORIA[tipo.id]}</div>
              <h3 className="font-medium text-foreground">{tipo.nome}</h3>
              <p className="text-xs text-muted-foreground">{tipo.descricao}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Editor de Layouts
          </h1>
          <p className="text-muted-foreground text-sm">
            Selecione um documento para editar
          </p>
        </div>
        <Button onClick={handleNovoDocumento} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo
        </Button>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <Input
          placeholder="Buscar documento..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Lista de Documentos */}
      <div className="flex-1 space-y-2 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <Loader className="w-5 h-5 animate-spin mr-2" />
            Carregando...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="mb-2">Nenhum documento encontrado</p>
            <Button variant="outline" size="sm" onClick={handleNovoDocumento}>
              Criar primeiro documento
            </Button>
          </div>
        ) : (
          filtrados.map(doc => (
            <button
              key={doc.id}
              onClick={() => onSelecionado(doc)}
              className="w-full text-left p-4 rounded-lg bg-muted/50 hover:bg-muted border border-border/40 transition flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{ICON_CATEGORIA[doc.categoria] || '📄'}</span>
                  <h3 className="font-medium text-foreground">
                    {doc.nome}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {doc.descricao}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground dark:group-hover:text-gray-300" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}