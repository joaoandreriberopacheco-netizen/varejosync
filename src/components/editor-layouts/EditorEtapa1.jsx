import React, { useState } from 'react';
import { ChevronRight, FileText, Receipt, Package, Layers, BarChart3, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TIPOS_DOCUMENTO = [
  { id: 'comprovante', nome: 'Comprovante', icon: Receipt, cor: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'protocolo', nome: 'Protocolo', icon: FileText, cor: 'bg-green-50 dark:bg-green-900/20' },
  { id: 'nota_fiscal', nome: 'Nota Fiscal', icon: Package, cor: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 'manifesto', nome: 'Manifesto', icon: Layers, cor: 'bg-orange-50 dark:bg-orange-900/20' },
  { id: 'relatorio', nome: 'Relatório', icon: BarChart3, cor: 'bg-red-50 dark:bg-red-900/20' },
  { id: 'formulario', nome: 'Formulário', icon: ClipboardList, cor: 'bg-gray-50 dark:bg-gray-800' },
];

export default function EditorEtapa1({ onSelecionado }) {
  const [busca, setBusca] = useState('');

  const filtrados = TIPOS_DOCUMENTO.filter(tipo =>
    tipo.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          Novo Layout
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Selecione o tipo de documento a customizar
        </p>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <Input
          placeholder="Buscar tipo de documento..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Grid de Tipos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
        {filtrados.map((tipo) => {
          const Icon = tipo.icon;
          return (
            <button
              key={tipo.id}
              onClick={() => onSelecionado(tipo)}
              className={`
                relative p-4 rounded-xl transition-all duration-200
                ${tipo.cor}
                hover:shadow-md active:scale-95
                flex flex-col items-center justify-center gap-3
                border border-transparent hover:border-gray-300 dark:hover:border-gray-600
              `}
            >
              <Icon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
              <span className="font-medium text-gray-900 dark:text-white text-sm">
                {tipo.nome}
              </span>
              <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </button>
          );
        })}
      </div>

      {filtrados.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Nenhum tipo encontrado</p>
        </div>
      )}
    </div>
  );
}