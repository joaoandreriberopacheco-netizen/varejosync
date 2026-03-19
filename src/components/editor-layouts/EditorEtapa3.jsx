import React, { useState } from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EditorEtapa3({ tipoDocumento, blocksConfig, onVoltar }) {
  const isNovo = !tipoDocumento.id || tipoDocumento.isNovo;
  const [nome, setNome] = useState(tipoDocumento.nome || `Layout ${tipoDocumento.nome}`);
  const [observacoes, setObservacoes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast.error('Nome do layout é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      const isNovo = !tipoDocumento.id || tipoDocumento.isNovo;

      if (isNovo) {
        // Criar novo documento
        await base44.entities.LayoutTemplate.create({
          nome: nome.trim(),
          categoria: tipoDocumento.id || tipoDocumento.categoria,
          tipo: tipoDocumento.id || tipoDocumento.categoria,
          blocks_config: JSON.stringify(blocksConfig),
          descricao: observacoes || `Layout customizado para ${tipoDocumento.nome}`,
        });

        // Registrar evento de aprendizado - novo template
        await base44.entities.EventoEditorLayout.create({
          tipo_evento: 'template_salvo',
          descricao_acao: `Template "${nome}" criado para ${tipoDocumento.nome}`,
          dados_evento: JSON.stringify({ tipoDocumento, blocksCount: blocksConfig.length }),
          sequencia_blocos: JSON.stringify(blocksConfig),
        });

        toast.success('Novo layout criado com sucesso!');
      } else {
        // Atualizar documento existente
        await base44.entities.LayoutTemplate.update(tipoDocumento.id, {
          blocks_config: JSON.stringify(blocksConfig),
          descricao: observacoes || tipoDocumento.descricao,
        });

        // Registrar evento de aprendizado - edição
        await base44.entities.EventoEditorLayout.create({
          tipo_evento: 'bloco_modificado',
          descricao_acao: `Template "${tipoDocumento.nome}" foi atualizado`,
          dados_evento: JSON.stringify({ blocksCount: blocksConfig.length }),
          sequencia_blocos: JSON.stringify(blocksConfig),
          template_layout_id: tipoDocumento.id,
        });

        toast.success('Layout atualizado com sucesso!');
      }

      // Volta para página de gerenciamento
      setTimeout(() => {
        window.location.href = '/LayoutTemplates';
      }, 1000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar layout');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 p-4 md:p-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Finalizar Layout
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Nomeie e adicione observações ao seu layout
        </p>
      </div>

      {/* Formulário */}
      <div className="flex-1 space-y-4">
        {/* Tipo Documento (read-only) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Tipo de Documento
          </label>
          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
            {tipoDocumento.nome}
          </div>
        </div>

        {/* Nome do Layout */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Nome do Layout *
          </label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Comprovante Padrão 2026"
            className="w-full"
          />
        </div>

        {/* Blocos Utilizados (info) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Blocos Utilizados
          </label>
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 text-sm">
            {blocksConfig.length} blocos configurados
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {blocksConfig.map(b => b.tipo).join(', ')}
            </div>
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Observações (opcional)
          </label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: Usado para emissão de comprovantes em loja física"
            rows={4}
            className="w-full resize-none"
          />
        </div>
      </div>

      {/* Rodapé com Botões */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onVoltar} className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button
          onClick={handleSalvar}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvando...' : 'Salvar Layout'}
        </Button>
      </div>
    </div>
  );
}