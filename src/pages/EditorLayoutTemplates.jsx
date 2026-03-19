import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TemplateBlockEditor from '@/components/comprovantes/TemplateBlockEditor';
import { Plus, Trash2, Edit2, Copy } from 'lucide-react';

const CATEGORIAS = {
  comprovante: '🧾 Comprovante',
  relatorio: '📊 Relatório',
  nota_fiscal: '📄 Nota Fiscal',
  orcamento: '💬 Orçamento',
  manifesto: '📦 Manifesto',
  outro: '📋 Outro'
};

export default function EditorLayoutTemplates() {
  const [templates, setTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  
  // Dados de edição
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('comprovante');
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.LayoutTemplate.list();
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      alert('Nome do template é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        nome,
        categoria,
        tipo,
        descricao,
        blocks_config: JSON.stringify(blocks)
      };

      if (editingId) {
        await base44.entities.LayoutTemplate.update(editingId, templateData);
      } else {
        await base44.entities.LayoutTemplate.create(templateData);
      }

      handleCancel();
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      alert('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja deletar este template?')) {
      try {
        await base44.entities.LayoutTemplate.delete(id);
        await loadTemplates();
      } catch (error) {
        console.error('Erro ao deletar template:', error);
      }
    }
  };

  const handleEdit = (template) => {
    setEditingId(template.id);
    setNome(template.nome);
    setCategoria(template.categoria);
    setTipo(template.tipo);
    setDescricao(template.descricao);
    try {
      setBlocks(JSON.parse(template.blocks_config || '[]'));
    } catch {
      setBlocks([]);
    }
    setIsCreating(true);
  };

  const handleDuplicate = async (template) => {
    setSaving(true);
    try {
      const newData = {
        nome: `${template.nome} (cópia)`,
        categoria: template.categoria,
        tipo: template.tipo,
        descricao: template.descricao,
        blocks_config: template.blocks_config
      };
      await base44.entities.LayoutTemplate.create(newData);
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setNome('');
    setCategoria('comprovante');
    setTipo('');
    setDescricao('');
    setBlocks([]);
  };

  const filteredTemplates = templates.filter(t =>
    (t.nome.toLowerCase().includes(filter.toLowerCase()) || 
     t.tipo?.toLowerCase().includes(filter.toLowerCase())) &&
    (!filterCategoria || t.categoria === filterCategoria)
  );

  if (isCreating) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{CATEGORIAS[categoria]}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{nome || 'Novo Template'}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        {/* Meta info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Nome</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Cupom Venda Padrão"
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                >
                  {Object.entries(CATEGORIAS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Tipo</label>
                <Input
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="venda, compra, etc"
                  className="text-xs"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Descrição</label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes sobre este layout"
              className="text-xs"
            />
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <TemplateBlockEditor blocks={blocks} onBlocksChange={setBlocks} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-quicksand text-gray-900 dark:text-white">Editor de Layouts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customize o visual de todos os outputs do sistema</p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            setNome('');
            setCategoria('comprovante');
            setTipo('');
            setDescricao('');
            setBlocks([]);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Buscar por nome ou tipo..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1"
        />
        <select
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        >
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIAS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Lista de Templates */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {templates.length === 0 ? 'Nenhum template criado' : 'Nenhum template encontrado'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORIAS[template.categoria].split(' ')[0]}</span>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">{template.nome}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {CATEGORIAS[template.categoria]} {template.tipo && `· ${template.tipo}`} · {template.blocks_config ? JSON.parse(template.blocks_config || '[]').length : 0} blocos
                    </p>
                    {template.descricao && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{template.descricao}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <Button
                  onClick={() => handleEdit(template)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleDuplicate(template)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Duplicar"
                  disabled={saving}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleDelete(template.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Deletar"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}