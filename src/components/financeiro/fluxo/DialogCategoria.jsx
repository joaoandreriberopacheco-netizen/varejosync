import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Mini modal para criar categoria rapidamente inline
export function NovaCategoriaInline({ tipo, onCriada, onCancelar }) {
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSalvar = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    const cat = await base44.entities.CategoriaFinanceira.create({ nome: nome.trim(), tipo, ativa: true });
    toast({ title: `Categoria "${nome}" criada!` });
    onCriada(cat);
    setSaving(false);
  };

  return (
    <div className="mt-2 bg-muted/40 dark:bg-muted rounded-xl p-3 flex gap-2">
      <input autoComplete="off"
        autoFocus
        value={nome}
        onChange={e => setNome(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSalvar(); if (e.key === 'Escape') onCancelar(); }}
        placeholder="Nome da categoria"
        className="flex-1 min-w-0 bg-transparent text-sm text-foreground/90 placeholder:text-muted-foreground outline-none"
      />
      <button onClick={handleSalvar} disabled={saving || !nome.trim()}
        className="px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-foreground text-xs font-medium disabled:opacity-40">
        OK
      </button>
      <button onClick={onCancelar} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

// Hook para carregar categorias
export function useCategorias() {
  const [categorias, setCategorias] = useState([]);

  const load = async () => {
    const cats = await base44.entities.CategoriaFinanceira.filter({ ativa: true });
    setCategorias(cats);
  };

  useEffect(() => { load(); }, []);

  return { categorias, reload: load };
}

// Seletor de categoria com botão de criar
export function SeletorCategoria({ tipo, value, onChange, categorias, onCriada }) {
  const [showNova, setShowNova] = useState(false);
  const filtradas = categorias.filter(c => c.tipo === tipo);

  return (
    <div className="bg-card rounded-2xl shadow-sm p-4 space-y-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Categoria</p>
      <div className="flex flex-wrap gap-2">
        {filtradas.map(c => (
          <button key={c.id} onClick={() => onChange(value === c.nome ? '' : c.nome, c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${value === c.nome
              ? 'bg-gray-900 dark:bg-white text-white dark:text-foreground'
              : 'bg-muted text-muted-foreground'}`}>
            {c.nome}
          </button>
        ))}
        <button onClick={() => setShowNova(true)}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/40 dark:bg-muted text-muted-foreground border border-dashed border-gray-300 dark:border-gray-600 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Nova
        </button>
      </div>
      {showNova && (
        <NovaCategoriaInline
          tipo={tipo}
          onCriada={(cat) => { onCriada(cat); onChange(cat.nome, cat.id); setShowNova(false); }}
          onCancelar={() => setShowNova(false)}
        />
      )}
    </div>
  );
}